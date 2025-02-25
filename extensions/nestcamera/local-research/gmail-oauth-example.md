Querying Perplexity AI using sonar-pro for: Show me the complete OAuth implementation from the Raycast Gmail extension, focusing on how they configure the OAuth client and handle redirects.
Here's the key OAuth implementation from the Raycast Gmail extension:

```typescript
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Gmail",
  providerIcon: "gmail-logo.png",
  description: "Connect your Gmail account"
});

const authRequest = await client.authorizationRequest({
  endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  clientId: "YOUR_CLIENT_ID",
  scope: "https://www.googleapis.com/auth/gmail.readonly"
});

const { authorizationCode } = await client.authorize(authRequest);

const tokens = await fetchTokens(authRequest, authorizationCode);
await client.setTokens(tokens);

async function fetchTokens(authRequest, authCode) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: "YOUR_CLIENT_ID",
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI
    })
  });
  return response.json();
}
```

Key points:
- Uses OAuth.PKCEClient with Web redirect method
- Configures auth request with Google OAuth endpoint, client ID, and Gmail scope
- Handles authorization code exchange for tokens
- Stores tokens securely using client.setTokens()[1][2][3]