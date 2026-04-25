import {
  DeviceRefreshResponseSchema,
  DeviceTokenResponseSchema,
  type DeviceRefreshResponse,
  type DeviceTokenResponse,
} from "@/schemas/auth";
import { SpooError } from "@/lib/errors";
import { buildAuthorizationRequest, oauthClient } from "@/lib/oauth";
import { getApiBaseUrl } from "@/constants";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export async function signIn(): Promise<DeviceTokenResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const request = await buildAuthorizationRequest(apiBaseUrl);
  const { authorizationCode } = await oauthClient.authorize(request);
  const tokens = await exchangeCode(apiBaseUrl, authorizationCode);
  await persistTokens(tokens.access_token, tokens.refresh_token);
  return tokens;
}

export async function signOut(): Promise<void> {
  await oauthClient.removeTokens();
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<string> {
  const apiBaseUrl = getApiBaseUrl();
  const refreshed = await exchangeRefresh(apiBaseUrl, refreshToken);
  await persistTokens(refreshed.access_token, refreshed.refresh_token);
  return refreshed.access_token;
}

export async function getStoredTokens() {
  return oauthClient.getTokens();
}

async function persistTokens(accessToken: string, refreshToken: string) {
  await oauthClient.setTokens({
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

async function exchangeCode(
  apiBaseUrl: string,
  code: string,
): Promise<DeviceTokenResponse> {
  const res = await fetch(`${apiBaseUrl}/auth/device/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw await SpooError.fromResponse(res);
  return DeviceTokenResponseSchema.parse(await res.json());
}

async function exchangeRefresh(
  apiBaseUrl: string,
  refreshToken: string,
): Promise<DeviceRefreshResponse> {
  const res = await fetch(`${apiBaseUrl}/auth/device/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw await SpooError.fromResponse(res);
  return DeviceRefreshResponseSchema.parse(await res.json());
}
