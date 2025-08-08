import { OAuth, showHUD } from "@raycast/api";

const PROVIDER_ID = "buenote-auth0";
const AUTH0_DOMAIN = "auth.buenote.app";
const AUTH0_CLIENT_ID = "JCC0f0MP038c7UWtBbkV4v4DYCuNfGnq";
const AUTH0_AUDIENCE = "https://buenote.app/api/";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.App, // or .Web if you use web redirect
  providerName: "Buenote",
  providerIcon: "icon.png",
  description: "Connect your Buenote account",
  providerId: PROVIDER_ID,
});

export async function getValidAccessToken(): Promise<string> {
  console.log("[OAuth] getValidAccessToken called");
  let tokenSet = await client.getTokens();
  if (!tokenSet || tokenSet.isExpired()) {
    console.log("[OAuth] No valid token set, starting OAuth flow");
    // Start OAuth flow
    const authRequest = await client.authorizationRequest({
      endpoint: `https://${AUTH0_DOMAIN}/authorize`,
      clientId: AUTH0_CLIENT_ID,
      scope: "openid profile email offline_access",
      extraParameters: {
        audience: AUTH0_AUDIENCE,
      },
    });
    console.log("[OAuth] authorizationRequest created", authRequest);
    const { authorizationCode } = await client.authorize(authRequest);
    console.log("[OAuth] authorize result", { authorizationCode });
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
    }).then((res) => {
      if (!res.ok) {
        throw new Error(`Token exchange failed: ${res.status} ${res.statusText}`);
      }
      return res.json();
    });
    console.log("[OAuth] tokenResponse", tokenResponse);
    await client.setTokens({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      idToken: tokenResponse.id_token,
      scope: tokenResponse.scope,
    });
    tokenSet = await client.getTokens();
    console.log("[OAuth] Tokens set", tokenSet);
  } else {
    console.log("[OAuth] Using cached token set", tokenSet);
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
  if (typeof (client as any).removeTokens === "function") {
    await (client as any).removeTokens();
  } else {
    // Fallback: overwrite with an expired token set so getValidAccessToken triggers the flow
    await client.setTokens({ accessToken: "", refreshToken: "", expiresIn: 0 });
  }
  await showHUD("Session expired – please log in again");
}
