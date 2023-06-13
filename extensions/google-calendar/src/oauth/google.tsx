import { OAuth, popToRoot } from "@raycast/api";
import fetch from "node-fetch";
import { Calendar } from "../types/calendar";
import { Profile } from "../types/profile";
import useClientId from "../hooks/useClientId";

const clientId = useClientId();

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google Calendar",
  providerIcon: "google-calendar-logo.png",
  providerId: "google",
  description: "Connect your Google account to interact with your calendar events.",
});

export async function authorize() {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const tokens = await refreshTokens(tokenSet.refreshToken);
      await client.setTokens(tokens);
      return tokens.access_token;
    }
    return tokenSet.accessToken;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: clientId,
    scope:
      "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.settings.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.readonly",
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
    resetOAuthTokens();
    authorize();
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
    console.error("refresh tokens error:", await response.text());
    resetOAuthTokens();
    authorize();
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function fetchCalendarList(): Promise<{ calendars: Calendar[] }> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status == 401) {
      client.authorize;
    }
    console.error("Error fetching calendars:", await response.text());
    throw new Error(response.statusText);
  }

  const json = (await response.json()) as { calendars: Calendar[] };
  return json;
}

export async function resetOAuthTokens(): Promise<void> {
  await client.removeTokens();
}

export async function getEmail() {
  const token = (await client.getTokens())?.accessToken;
  const url = "https://www.googleapis.com/oauth2/v2/userinfo";
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as { email: Profile };
  return data.email;
}

export async function logOut() {
  resetOAuthTokens();
  popToRoot();
}
