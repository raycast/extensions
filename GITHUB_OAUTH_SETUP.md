# GitHub OAuth Setup for Cookery Raycast Extension

This extension uses GitHub OAuth for user authentication. Follow these steps to set up your GitHub OAuth app.

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
- **Client Secret**: Generate and copy this (needed for the extension)

## Step 3: Update Extension Code

Replace the placeholder values in `src/oauth.ts`:

```typescript
// Line 13: Replace with your actual GitHub Client ID
clientId: "YOUR_GITHUB_CLIENT_ID",

// Line 30: Replace with your actual GitHub Client ID  
client_id: "YOUR_GITHUB_CLIENT_ID",

// Line 31: Replace with your actual GitHub Client Secret
client_secret: "YOUR_GITHUB_CLIENT_SECRET",
```

## Step 4: Test the OAuth Flow

1. Run the Raycast extension
2. Click "Sign In with GitHub"
3. You'll be redirected to GitHub to authorize the app
4. After authorization, you'll be redirected back to Raycast
5. The extension will store your access token

## Security Notes

- **Never commit your Client Secret** to version control
- Consider using environment variables for sensitive credentials
- The Client Secret is used server-side for token exchange
- GitHub access tokens don't expire by default, but you can set expiration in your GitHub app settings

## GitHub OAuth Scopes Used

The extension requests the following scopes:
- `read:user`: Read user profile data
- `user:email`: Read user email address

These scopes are used to identify the user and provide personalized recipe suggestions.

## Troubleshooting

**Issue**: "Redirect URI mismatch" error
- **Solution**: Ensure the callback URL in GitHub app matches exactly: `https://raycast.com/redirect?packageName=cookery`

**Issue**: "Invalid client credentials" error
- **Solution**: Double-check that Client ID and Client Secret are correctly copied and placed in the code

**Issue**: OAuth flow doesn't complete
- **Solution**: Check that your GitHub app is set to "Active" and not "Development mode"
