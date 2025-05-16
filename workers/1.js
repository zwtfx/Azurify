// Handle all requests
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route requests
    if (path === '/api/verify') {
      return handleVerify(request);
    } else if (path === '/api/download') {
      return handleDownload(request);
    }
    
    return new Response('Not found', { status: 404 });
  }
}

// Store valid tokens in memory (for demo)
// In production, use Cloudflare KV storage
const validTokens = new Set();

// License verification
async function handleVerify(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { license } = await request.json();
    
    // Verify with KeyAuth API
    const keyauthResponse = await fetch('https://keyauth.win/api/1.2/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        type: 'license',
        key: license,
        ownerid: 'GmtLpb5nhS' // Your ownerid
      })
    });

    const keyauthData = await keyauthResponse.json();
    
    if (!keyauthData.success) {
      return Response.json({ error: 'Invalid license' }, { status: 403 });
    }

    // Generate token (valid for 5 minutes)
    const token = crypto.randomUUID();
    validTokens.add(token);
    
    // Auto-delete token after 5 minutes
    setTimeout(() => validTokens.delete(token), 300000);
    
    return Response.json({ token });
    
  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

// File download
async function handleDownload(request) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const token = new URL(request.url).searchParams.get('token');
  
  if (!token || !validTokens.has(token)) {
    return new Response('Invalid or expired token', { status: 403 });
  }

  // Fetch your tools.zip from a private location
  // Here are your free options:
  
  // OPTION 1: GitHub (hidden URL)
  // const fileResponse = await fetch('https://github.com/.../tools.zip?raw=true');
  
  // OPTION 2: Telegram (private bot file)
  // const fileResponse = await fetch('https://api.telegram.org/file/bot<TOKEN>/<FILE_PATH>');
  
  // OPTION 3: Discord attachment
  // const fileResponse = await fetch('https://cdn.discordapp.com/attachments/.../tools.zip');
  
  // OPTION 4: Backblaze B2 (free tier)
  // const fileResponse = await fetch('https://f003.backblazeb2.com/file/.../tools.zip');
  
  // For this example, I'll use a GitHub URL (replace with yours)
  const fileResponse = await fetch('https://github.com/SuperJos10/Azurify/releases/download/tool/tools.zip');
  
  if (!fileResponse.ok) {
    return new Response('File not found', { status: 404 });
  }

  // Remove token after use
  validTokens.delete(token);
  
  // Return the file
  return new Response(fileResponse.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="tools.zip"'
    }
  });
}
