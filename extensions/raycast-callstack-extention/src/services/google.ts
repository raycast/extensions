import { OAuth } from "@raycast/api";
import addDays from "date-fns/addDays";
import addMonths from "date-fns/addMonths";
import compareAsc from "date-fns/compareAsc";
import subMonths from "date-fns/subMonths";
import fetch from "node-fetch";

export type Event = {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: AttendeesResult[];
};

type AttendeesResult = { id: string; displayName: string; responseStatus: string; email: string; self: boolean };

type EventResult = {
  id: string;
  summary: string;
  start: {
    dateTime: string;
  };
  end: { dateTime: string };
  status: string;
  attendees: AttendeesResult[];
};

const clientId = "956961417641-klq2d9guabascc0gbnk67gemdtc4gdts.apps.googleusercontent.com";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: "google-logo.png",
  providerId: "google",
  description: "Connect your Google account",
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
    scope: "https://www.googleapis.com/auth/calendar.readonly",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
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

// API

export async function fetchUpcomingEvents(): Promise<Event[]> {
  const params = new URLSearchParams();
  params.append("fields", "items(id,start/dateTime,end/dateTime,summary,status,attendees)");
  params.append("singleEvents", "true");
  params.append("timeMin", new Date().toISOString());
  params.append("timeMax", addDays(new Date(), 1).toISOString());
  params.append("pageSize", "10");

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?" + params.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  const json = await response.json();

  return json.items
    ?.filter(
      (item: EventResult) =>
        item.start !== undefined && item.attendees?.find((i) => i.self)?.responseStatus !== "declined"
    )
    ?.sort((a: EventResult, b: EventResult) => {
      return compareAsc(new Date(a.start?.dateTime), new Date(b.end?.dateTime));
    })
    ?.map((item: EventResult) => {
      return {
        id: item.id,
        title: item.summary,
        start: item.start?.dateTime,
        end: item.end?.dateTime,
        attendees: item.attendees,
      };
    });
}

export async function fetchEventsWithEmployee(email: string): Promise<Event[]> {
  const params = new URLSearchParams();
  params.append("q", email);
  params.append("fields", "items(id,start/dateTime,end/dateTime,summary,status,attendees)");
  params.append("timeMax", addMonths(new Date(), 2).toISOString());
  params.append("singleEvents", "true");
  params.append("timeMin", subMonths(new Date(), 1).toISOString());
  params.append("pageSize", "100");

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?" + params.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }

  const json = await response.json();

  const sorted = json.items
    ?.filter(
      (item: EventResult) =>
        item.summary !== "Callstack Thursday" &&
        item.summary !== "Callstack All Hands" &&
        item.start !== undefined &&
        item.attendees?.find((i) => i.self)?.responseStatus !== "declined"
    )
    ?.sort((a: EventResult, b: EventResult) => {
      return compareAsc(new Date(a.start?.dateTime), new Date(b.end?.dateTime));
    })
    ?.map((item: EventResult) => {
      return {
        id: item.id,
        title: item.summary,
        start: item.start?.dateTime,
        end: item.end?.dateTime,
        attendees: item.attendees,
      };
    });

  return sorted;
}
