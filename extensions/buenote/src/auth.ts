import { OAuth, showHUD } from "@raycast/api";

const PROVIDER_ID = "buenote-auth0";
const AUTH0_DOMAIN = "dev-gfcysmxlyt2fbx27.us.auth0.com";
const AUTH0_CLIENT_ID = "JCC0f0MP038c7UWtBbkV4v4DYCuNfGnq";
const AUTH0_AUDIENCE = "https://dev-gfcysmxlyt2fbx27.us.auth0.com/api/v2/";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.App, // or .Web if you use web redirect
  providerName: "Buenote",
  providerIcon: "icon.png",
  description: "Connect your Buenote account",
  providerId: PROVIDER_ID,
});

export async function getValidAccessToken(): Promise<string> {
  let tokenSet = await client.getTokens();
  if (!tokenSet || tokenSet.isExpired()) {
    // Start OAuth flow
    const authRequest = await client.authorizationRequest({
      endpoint: `https://${AUTH0_DOMAIN}/authorize`,
      clientId: AUTH0_CLIENT_ID,
      scope: "openid profile email offline_access",
      extraParameters: {
        audience: AUTH0_AUDIENCE,
      },
    });
    const { authorizationCode } = await client.authorize(authRequest);
    // Exchange code for tokens
    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: AUTH0_CLIENT_ID,
        code: authorizationCode,
        code_verifier: authRequest.codeVerifier,
        redirect_uri: authRequest.redirectURI,
        audience: AUTH0_AUDIENCE,
      }),
    }).then((res) => res.json());
    await client.setTokens({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      idToken: tokenResponse.id_token,
      scope: tokenResponse.scope,
    });
    tokenSet = await client.getTokens();
  }
  return tokenSet!.accessToken;
}

export async function promptLogin() {
  await getValidAccessToken();
  await showHUD("Logged in to Buenote");
}

export async function clearTokens() {
  // Removes any stored OAuth tokens – callers can then trigger getValidAccessToken() to re-authenticate
  // Raycast SDK exposes removeTokens() for PKCEClient instances. If the method is unavailable for
  // some reason, fall back to setting an empty token set.
  // @ts-expect-error – removeTokens exists at runtime even if not in typings
  if (typeof client.removeTokens === "function") {
    await client.removeTokens();
  } else {
    // Fallback: overwrite with an expired token set so getValidAccessToken triggers the flow
    await client.setTokens({ accessToken: "", refreshToken: "", expiresIn: 0 });
  }
  await showHUD("Session expired – please log in again");
}
