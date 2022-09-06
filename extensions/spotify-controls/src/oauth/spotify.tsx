import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

import { URLSearchParams } from "url";

// Register a new OAuth app via https://developer.twitter.com/en/portal/dashboard
// Select OAuth 2.0
// As type of app choose: Native App
// For the redirect URL enter: https://raycast.com/redirect
// For the website URL enter: https://raycast.com
const clientId = "bd803bbbe5544933bacf4c34af112fff";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.App,
  providerName: "Spotify",
  providerIcon: "icon.png",
  description: "Connect your Spotify account\n(Raycast Extension Demo)"
});

// Authorization

const scope = "user-modify-playback-state user-read-playback-state";

export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }

    if (tokenSet.scope === scope) return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.spotify.com/authorize",
    clientId: clientId,
    scope: scope
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", body: params });
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

  const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export const spotifyOauth = {
  authorize,
  fetchTokens,
  refreshTokens,
  client,
  fetchDevices,
  transferPlayback
};

// API

export interface DevicesItem {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export async function fetchDevices(): Promise<DevicesItem[]> {
  const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`
    }
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as { devices: DevicesItem[] };

  return json.devices;
}

export async function transferPlayback(deviceId: string): Promise<void> {
  const response = await fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`
    },
    body: JSON.stringify({ device_ids: [deviceId] })
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
}
