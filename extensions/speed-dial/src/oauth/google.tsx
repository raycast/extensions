import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { Calendar, Event, FetchColorsResponse, GetCalendarsResponse, GetEventsResponse, MonthRange } from "../types";

const clientId = "744024519316-itr7tgto1idb8bsm2o7r9gl8ph53dsmu.apps.googleusercontent.com";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: "google-icon.png",
  providerId: "google",
  description: "Connect your Google account\n(Raycast Speed Dial)",
});

// Authorization
export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: clientId,
    scope:
      "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function logout(): Promise<void> {
  await client.removeTokens();
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
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function fetchColors(): Promise<FetchColorsResponse> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/colors", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as FetchColorsResponse;
  return json;
}

export async function fetchCalendars(): Promise<Calendar[]> {
  const params = new URLSearchParams();
  params.append("showHidden", "false");

  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?" + params.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as GetCalendarsResponse;
  return json.items;
}

export async function fetchEvents(calendarId: string, monthRange: MonthRange): Promise<Event[]> {
  const params = new URLSearchParams();

  // get events from month range
  const timeMin = new Date();

  // calculate max time for end of current month
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 1);
  timeMax.setDate(0);

  if (monthRange === MonthRange.CURRENT_MONTH) {
    // calculate min time from start of current month
    timeMin.setDate(1);
  } else if (monthRange === MonthRange.LAST_THREE_MONTHS) {
    // calculate min time from start of three months ago
    timeMin.setMonth(timeMin.getMonth() - 3);
    timeMin.setDate(1);
  } else if (monthRange === MonthRange.NEXT_MONTH) {
    // calculate min time from start of next month
    timeMin.setMonth(timeMin.getMonth() + 1);
    timeMin.setDate(1);

    // calculate max time for end of next month
    timeMax.setMonth(timeMax.getMonth() + 2);
    timeMax.setDate(0);
  }

  params.append("timeMax", timeMax.toISOString());
  params.append("timeMin", timeMin.toISOString());

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` + params.toString();

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as GetEventsResponse;
  return json.items;
}
