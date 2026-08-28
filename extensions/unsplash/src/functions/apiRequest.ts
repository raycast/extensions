import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import { client, doAuth } from "@/oauth";
import { Errors } from "@/types";

type ApiRequestOptions = RequestInit & {
  /** When true, run OAuth if no user token is stored (needed for like / /me). */
  requireUserAuth?: boolean;
};

export const apiRequest = async <T>(path: string, options?: ApiRequestOptions): Promise<T> => {
  const { requireUserAuth, ...fetchOptions } = options ?? {};
  const tokens = await client.getTokens();
  let accessToken = tokens?.accessToken;

  if (accessToken && tokens?.refreshToken && tokens.isExpired()) {
    await client.setTokens(await refreshTokens(tokens.refreshToken));
    accessToken = (await client.getTokens())?.accessToken;
  }

  if (!accessToken && requireUserAuth) {
    await LocalStorage.clear();
    await doAuth();
    accessToken = (await client.getTokens())?.accessToken;
  }

  const { accessKey } = getPreferenceValues<Preferences>();
  const authorization = accessToken ? `Bearer ${accessToken}` : `Client-ID ${accessKey.trim()}`;

  if (requireUserAuth && !accessToken) {
    throw new Error("Authentication required. Connect your Unsplash account and try again.");
  }

  const url = path.startsWith("https://api.unsplash.com/") ? path : `https://api.unsplash.com${path}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      ...fetchOptions.headers,
    },
  });

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("json")) {
    throw new Error((await response.text()) || response.statusText || `HTTP ${response.status}`);
  }

  const result = await response.json();
  if (!response.ok) {
    const errors = (result as Errors).errors;
    throw new Error(errors?.[0] || response.statusText || `HTTP ${response.status}`);
  }
  return result as T;
};

export const triggerDownload = (downloadLocation: string): void => {
  apiRequest<unknown>(downloadLocation).catch(() => undefined);
};

async function refreshTokens(refreshToken: string) {
  const { accessKey } = getPreferenceValues<Preferences>();
  const params = new URLSearchParams();
  params.append("client_id", accessKey.trim());
  params.append("refresh_token", refreshToken.trim());
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://unsplash.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText || `HTTP ${response.status}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
