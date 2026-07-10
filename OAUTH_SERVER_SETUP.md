# OAuth Server Setup for Supabase Proxy

The Cookery Raycast extension uses OAuth with custom endpoints that proxy to Supabase authentication. This allows the extension to use standard OAuth PKCE flow while leveraging Supabase for user authentication.

## Required Endpoints

### 1. Authorization Endpoint
**URL:** `https://cookeryapp.pages.dev/oauth/authorize`

**Purpose:** Handle the initial OAuth authorization request and redirect to Supabase auth

**Implementation:**
1. Receive PKCE parameters from Raycast (code_challenge, code_verifier, state, redirect_uri)
2. Redirect to Supabase auth URL with Supabase-specific parameters
3. Store PKCE parameters temporarily (e.g., in session or database)
4. After Supabase authentication, redirect back to Raycast with authorization code

**Supabase Auth URL:**
```
https://ojvigxnwweixjhugekmm.supabase.co/auth/v1/authorize
```

### 2. Token Endpoint
**URL:** `https://cookeryapp.pages.dev/oauth/token`

**Purpose:** Exchange authorization code for access/refresh tokens

**Implementation:**
1. Receive authorization code from Raycast
2. Exchange code with Supabase for tokens
3. Return standard OAuth token response

**Request Body:**
```json
{
  "code": "authorization_code_from_raycast",
  "client_id": "cookery-raycast-extension",
  "grant_type": "authorization_code"
}
```

**Response Format:**
```json
{
  "access_token": "supabase_access_token",
  "refresh_token": "supabase_refresh_token",
  "expires_in": 3600
}
```

## Supabase Configuration

### Supabase Project Details
- **URL:** `https://ojvigxnwweixjhugekmm.supabase.co`
- **Client ID:** `cookery-raycast-extension`

### Required Supabase Setup
1. Enable OAuth providers in Supabase dashboard
2. Configure redirect URI in Supabase:
   - Add `https://raycast.com/redirect?packageName=cookery` to allowed redirect URLs
3. Create OAuth app in Supabase (if needed)

## Flow Diagram

```
Raycast Extension
    ↓ (1. Authorization Request with PKCE)
cookeryapp.pages.dev/oauth/authorize
    ↓ (2. Redirect to Supabase)
Supabase Auth
    ↓ (3. User authenticates)
    ↓ (4. Redirect back to cookeryapp)
cookeryapp.pages.dev/oauth/authorize
    ↓ (5. Redirect to Raycast with code)
Raycast Extension
    ↓ (6. Token exchange request)
cookeryapp.pages.dev/oauth/token
    ↓ (7. Exchange code with Supabase)
Supabase Auth
    ↓ (8. Return tokens)
cookeryapp.pages.dev/oauth/token
    ↓ (9. Return standard OAuth tokens)
Raycast Extension
```

## Example Server Implementation (Node.js)

```javascript
// Authorization endpoint
app.get('/oauth/authorize', (req, res) => {
  const { code_challenge, code_verifier, state, redirect_uri } = req.query;
  
  // Store PKCE parameters (e.g., in Redis or database)
  storePKCEParams(state, { code_challenge, code_verifier, redirect_uri });
  
  // Redirect to Supabase auth
  const supabaseAuthUrl = `https://ojvigxnwweixjhugekmm.supabase.co/auth/v1/authorize?client_id=cookery-raycast-extension&redirect_uri=${encodeURIComponent('https://cookeryapp.pages.dev/oauth/callback')&response_type=code&state=${state}`;
  
  res.redirect(supabaseAuthUrl);
});

// Callback endpoint (after Supabase auth)
app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;
  const pkceParams = getPKCEParams(state);
  
  // Redirect back to Raycast with the code
  res.redirect(`${pkceParams.redirect_uri}?code=${code}&state=${state}`);
});

// Token endpoint
app.post('/oauth/token', async (req, res) => {
  const { code, client_id, grant_type } = req.body;
  
  // Exchange code with Supabase
  const supabaseResponse = await fetch('https://ojvigxnwweixjhugekmm.supabase.co/auth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id,
      grant_type
    })
  });
  
  const tokens = await supabaseResponse.json();
  
  // Return standard OAuth response
  res.json({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in
  });
});
```

## Testing

1. Deploy the OAuth proxy endpoints
2. Configure Supabase redirect URLs
3. Test the flow in Raycast extension
4. Verify token storage and refresh functionality
