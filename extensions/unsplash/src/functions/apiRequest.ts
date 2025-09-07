import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import { client, doAuth } from "@/oauth";
import { Errors } from "@/types";

const { accessKey } = getPreferenceValues<Preferences>();

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
  });
  if (!response.headers.get("Content-Type")?.includes("json")) throw new Error(await response.text());
  const result = await response.json();
  if (!response.ok) throw new Error((result as Errors).errors[0]);
  return result as T;
};

async function refreshTokens(refreshToken: string) {
  const params = new URLSearchParams();

  params.append("client_id", accessKey.trim());
  params.append("refresh_token", refreshToken.trim());
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
