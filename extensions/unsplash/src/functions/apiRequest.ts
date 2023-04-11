import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import fetch, { type RequestInit } from "node-fetch";
import { client, doAuth } from "@/oauth";

const { accessKey } = getPreferenceValues<UnsplashPreferences>();

export const apiRequest = async <T>(path: string, options?: RequestInit) => {
  const tokens = await client.getTokens();
  let accessToken = tokens?.accessToken;

  if (!accessToken) {
    await LocalStorage.clear();
    await doAuth();
    accessToken = (await client.getTokens())?.accessToken;
  } else if (tokens?.refreshToken && tokens?.isExpired()) {
    await client.setTokens(await refreshTokens(tokens.refreshToken));
    accessToken = (await client.getTokens())?.accessToken;
  }

  const url = path.startsWith("https://api.unsplash.com/") ? path : `https://api.unsplash.com${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  }).then(async (res) => res.json() as Promise<T>);
  return response;
};

async function refreshTokens(refreshToken: string) {
  const params = new URLSearchParams();

  params.append("client_id", accessKey);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://unsplash.com/oauth/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;

  return tokenResponse;
}
