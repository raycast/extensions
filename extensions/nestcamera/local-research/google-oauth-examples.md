Querying Perplexity AI using sonar-pro for: Find GitHub repositories of Raycast extensions that use Google OAuth integration. Look for specific examples with code showing how they handle the redirect URI and OAuth flow.
Here are some relevant GitHub repositories of Raycast extensions that use Google OAuth integration:

1. The official Raycast extensions repository contains an example of Google OAuth integration:

https://github.com/raycast/extensions/blob/main/examples/api-examples/src/oauth/google.tsx

Key code snippets:

```typescript
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: "google-logo.png",
  providerId: "google",
  description: "Connect your Google account\n(Raycast Extension Demo)",
});

const authRequest = await client.authorizationRequest({
  endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  clientId: clientId,
  scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly",
});

const { authorizationCode } = await client.authorize(authRequest);
```

2. The Gmail extension for Raycast uses Google OAuth:

https://github.com/raycast/extensions/tree/main/extensions/gmail

It uses the OAuthService utility from Raycast:

```typescript
const google = OAuthService.google({
  clientId: preferences.clientId,
  scope: "https://www.googleapis.com/auth/gmail.modify",
});
```

These examples show how to handle the redirect URI and OAuth flow using Raycast's built-in OAuth utilities, which abstract away much of the complexity[1][4][10].