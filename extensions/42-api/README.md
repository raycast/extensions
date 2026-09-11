# 42 API

Track your 42 logtime and find peers in the clusters directly from Raycast.

## Setup

This extension uses the Raycast PKCE proxy for 42 OAuth. You do not need to enter credentials in Raycast.

### 42 OAuth application setup

1. Go to [42 Intranet Applications](https://profile.intra.42.fr/oauth/applications).
2. Open the OAuth application used for this extension.
3. Configure the redirect URI exactly as:
   - `https://oauth.raycast.com/redirect`
4. Ensure the application has the `public` and `profile` scopes.

The regular Raycast OAuth redirect (`https://raycast.com/redirect?packageName=Extension`) is for direct PKCE flows. This extension uses the Raycast OAuth proxy because 42 requires a client secret for the token exchange, so 42 must redirect to `https://oauth.raycast.com/redirect`.
