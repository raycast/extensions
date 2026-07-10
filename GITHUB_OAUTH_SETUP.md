# GitHub OAuth Setup for Cookery Raycast Extension

This extension uses GitHub OAuth with a Cloudflare Worker for secure token exchange. This keeps your GitHub Client Secret secure on the server.

## Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Cookery Raycast Extension
   - **Homepage URL**: https://cookeryapp.pages.dev
   - **Application description**: Raycast extension for generating recipes
   - **Authorization callback URL**: `https://raycast.com/redirect?packageName=cookery`
4. Click "Register application"

## Step 2: Get Your Credentials

After creating the app, you'll see:
- **Client ID**: Copy this (needed for the extension)
- **Client Secret**: Generate and copy this (needed for Cloudflare Worker)

## Step 3: Deploy Cloudflare Worker

### Install Wrangler CLI
```bash
npm install -g wrangler
```

### Login to Cloudflare
```bash
wrangler login
```

### Configure Worker Secrets
```bash
# Set GitHub Client ID
wrangler secret put GITHUB_CLIENT_ID
# Enter your GitHub Client ID when prompted

# Set GitHub Client Secret
wrangler secret put GITHUB_CLIENT_SECRET
# Enter your GitHub Client Secret when prompted
```

### Deploy the Worker
```bash
wrangler deploy
```

After deployment, you'll get a URL like: `https://cookery-oauth-proxy.your-subdomain.workers.dev`

## Step 4: Update Extension Code

1. Update the Cloudflare Worker URL in `src/oauth.ts`:
```typescript
// Line 4: Replace with your actual Cloudflare Worker URL
const CLOUDFLARE_WORKER_URL = "https://cookery-oauth-proxy.your-subdomain.workers.dev";
```

2. Update the GitHub Client ID in `src/oauth.ts`:
```typescript
// Line 17: Replace with your actual GitHub Client ID
clientId: "YOUR_GITHUB_CLIENT_ID",
```

## Step 5: Test the OAuth Flow

1. Run the Raycast extension
2. Click "Sign In with GitHub"
3. You'll be redirected to GitHub to authorize the app
4. After authorization, you'll be redirected back to Raycast
5. The extension will store your access token

## Security Benefits

- **Client Secret never exposed**: Stored securely in Cloudflare Worker environment variables
- **No secrets in extension code**: Only the Worker URL is in the extension
- **Server-side token exchange**: Worker handles the secure token exchange with GitHub
- **Easy secret rotation**: Update secrets in Cloudflare dashboard without redeploying extension

## GitHub OAuth Scopes Used

The extension requests the following scopes:
- `read:user`: Read user profile data
- `user:email`: Read user email address

These scopes are used to identify the user and provide personalized recipe suggestions.

## Troubleshooting

**Issue**: "Redirect URI mismatch" error
- **Solution**: Ensure the callback URL in GitHub app matches exactly: `https://raycast.com/redirect?packageName=cookery`

**Issue**: "Invalid client credentials" error
- **Solution**: Check that Cloudflare Worker secrets are set correctly

**Issue**: Worker returns 500 error
- **Solution**: Check Worker logs: `wrangler tail`

**Issue**: CORS errors
- **Solution**: The Worker includes CORS headers, but ensure the Worker URL is correct

## Cloudflare Worker Management

### View Worker Logs
```bash
wrangler tail
```

### Update Worker Secrets
```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

### Redeploy Worker
```bash
wrangler deploy
```
