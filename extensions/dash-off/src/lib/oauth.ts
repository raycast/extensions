import { OAuth } from "@raycast/api";
import fetch from "cross-fetch";

const raycastBundleId = process.env.RAYCAST_BUNDLE_ID?.includes("internal") ? "internal" : "production";

const clientIds = {
  internal: "294480066767-816sgubnqjc3u5mge0am5ncltgh8uvvr.apps.googleusercontent.com",
  production: "294480066767-1pk79i9blrm0tgva3c0p3a35j6f4upm6.apps.googleusercontent.com",
};

export const clientId = clientIds[raycastBundleId];

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Gmail",
  providerIcon: "gmail-logo.png",
  providerId: "gmail",
  description: "Connect your Gmail account",
});

export async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      try {
        const newTokens = await refreshTokens(tokenSet.refreshToken);
        await client.setTokens(newTokens);
      } catch (error) {
        // refresh failed, remove tokens to force re-login from user
        await client.removeTokens();
      }
    }
    return tokenSet.accessToken;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId,
    scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
  });
  const { authorizationCode } = await client.authorize(authRequest);

  const tokens = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokens);

  return tokens.access_token;
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
  if (!response.ok) {
    let error = "";
    try {
      const resonseData = await response.json();
      error = resonseData.error_description || (await response.text());
    } catch (err) {
      error = await response.text();
    }
    console.error("refresh tokens error:", error);
    throw new Error(`${response.statusText}: ${error}`);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
