import { OAuth, getPreferenceValues } from "@raycast/api";
import { checkConfiguration } from "./config-check";

// Create an OAuth client ID from the extension's preferences
const { clientId, oktaDomain: rawDomain } = getPreferenceValues<{ clientId?: string; oktaDomain?: string }>();
const oktaDomain = rawDomain?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Okta",
  providerIcon: "icon.svg",
  providerId: "okta",
  description: "Connect to your Okta account",
});

// ... imports

let authorizationPromise: Promise<string> | null = null;

export async function authorize(): Promise<string> {
  checkConfiguration();

  if (authorizationPromise) {
    return authorizationPromise;
  }

  authorizationPromise = (async () => {
    try {
      const tokenSet = await client.getTokens();
      if (tokenSet?.accessToken) {
        if (tokenSet.refreshToken && tokenSet.isExpired()) {
          try {
            const newTokens = await refreshTokens(tokenSet.refreshToken);
            await client.setTokens(newTokens);
            return newTokens.access_token;
          } catch {
            // If refresh fails, try re-authenticating
            console.error("Refresh failed");
          }
        }
        return tokenSet.accessToken;
      }

      const authRequest = await client.authorizationRequest({
        endpoint: `https://${oktaDomain}/oauth2/v1/authorize`,
        clientId: clientId!.trim(),
        scope: "openid profile email okta.users.read.self okta.users.read",
      });

      console.log("Authorization Request:", {
        redirectURI: authRequest.redirectURI,
        codeVerifierLength: authRequest.codeVerifier?.length,
      });

      const { authorizationCode } = await client.authorize(authRequest);
      const tokens = await fetchTokens(authRequest, authorizationCode);
      await client.setTokens(tokens);
      return tokens.access_token;
    } finally {
      authorizationPromise = null;
    }
  })();

  return authorizationPromise;
}

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authorizationCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId!.trim());
  params.append("code", authorizationCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(`https://${oktaDomain}/oauth2/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token fetch failed:", response.status, response.statusText, errorText);
    throw new Error(`Failed to fetch tokens: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId!);
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);

  const response = await fetch(`https://${oktaDomain}/oauth2/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function getAccessToken(): Promise<string> {
  return authorize();
}
