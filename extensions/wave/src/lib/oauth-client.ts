// Adapted from Airtable oauth-client.ts
import { OAuth } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fetch from "node-fetch";
import { ACCESS_TOKEN } from "./config";

const clientId = "5.TcftcT2oqkv43GjlpGxsPXdZh749u1YI2MH50W";
const clientSecret =
  "dPbuTFUiFVUMFWdlGtRAp0R6nI5EBnlHB2EfpgURv7lj17pX8JRXAEI8RK7urmWPuCLsksvXVdlEaiVolNlYhipA0W5PHPq0CZrT7gj3zQuQaeRiyf0C0N9eEETfojxm";
const scope = "business:read customer:read invoice:read product:read user:read";
const authorizeUrl = "https://api.waveapps.com/oauth2/authorize/";
const tokenUrl = "https://api.waveapps.com/oauth2/token/";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Wave",
  providerIcon: "wave.png",
  description: "Connect your Wave account",
});

// Authorization
export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();

  // If already authorized
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  // Othwerwise, go through authorization flow
  const authRequest = await client.authorizationRequest({
    endpoint: authorizeUrl,
    clientId,
    scope,
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const bodyParams = new URLSearchParams();
  bodyParams.append("client_id", clientId);
  bodyParams.append("client_secret", clientSecret);
  bodyParams.append("code", authCode);
  bodyParams.append("grant_type", "authorization_code");
  bodyParams.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams,
  });

  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const bodyParams = new URLSearchParams();
  bodyParams.append("client_id", clientId);
  bodyParams.append("client_secret", clientSecret);
  bodyParams.append("grant_type", "refresh_token");
  bodyParams.append("refresh_token", refreshToken);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams,
  });

  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

export const useToken = () =>
  useCachedPromise(async () => {
    if (ACCESS_TOKEN) return ACCESS_TOKEN;
    await authorize();
    const token = (await client.getTokens())?.accessToken ?? "";
    return token;
  });
