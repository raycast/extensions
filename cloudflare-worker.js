// Cloudflare Worker for GitHub OAuth token exchange with PKCE support
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      const { code, code_verifier } = body;

      if (!code) {
        return new Response("Missing authorization code", { status: 400 });
      }

      if (!code_verifier) {
        return new Response("Missing code_verifier for PKCE flow", { status: 400 });
      }

      // Exchange authorization code for access token with GitHub using PKCE
      const githubResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          code: code,
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code_verifier: code_verifier,
        }),
      });

      if (!githubResponse.ok) {
        const errorText = await githubResponse.text();
        return new Response(`GitHub token exchange failed: ${errorText}`, { status: 500 });
      }

      const tokens = await githubResponse.json();

      // Return the tokens to the extension
      return new Response(JSON.stringify(tokens), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },
};
