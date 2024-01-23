import { LocalStorage, OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { URLSearchParams } from "url";

// Create an OAuth client ID via https://console.developers.google.com/apis/credentials
// As application type choose "iOS" (required for PKCE)
// As Bundle ID enter: com.raycast
const clientId = "994303432955-kr88tn55djsil2a45o8krt6ntcvorhii.apps.googleusercontent.com";

export const client = new OAuth.PKCEClient({
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
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/contacts.other.readonly",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/cloud-platform",
    ].join(" "),
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

export async function logout(): Promise<void> {
  await client.removeTokens();
}

// API

interface PlaceInterface {
  displayName: { text: string };
  formattedAddress: string;
  googleMapsUri: string;
}

export type Contact = {
  name: string;
  emailAddress: string | null;
  self?: boolean;
};

export type CalendarEventDetails = {
  eventTitle: string;
  eventLocation?: string | PlaceInterface;
  eventDetails?: string;
  eventStart: string;
  eventEnd: string;
  guestList: string[] | Contact[];
  eventRecurrence?: string;
};

export async function fetchItems(): Promise<{ id: string; title: string }[]> {
  const params = new URLSearchParams();
  params.append("q", "trashed = false");
  params.append("fields", "files(id, name, mimeType, iconLink, modifiedTime, webViewLink, webContentLink, size)");
  params.append("orderBy", "recency desc");
  params.append("pageSize", "100");

  const response = await fetch("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as { files: { id: string; name: string }[] };
  return json.files.map((item) => ({ id: item.id, title: item.name }));
}

export async function searchOtherContacts(query: string | Contact): Promise<Contact[]> {
  const params = new URLSearchParams();
  params.append("query", query as string);
  params.append("readMask", "names,emailAddresses");
  params.append("pageSize", "10");

  const response = await fetch(`https://people.googleapis.com/v1/otherContacts:search?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("search contacts error:", await response.text());
    throw new Error(response.statusText);
  }

  const json = (await response.json()) as {
    results: {
      person: { resourceName: string; names: { displayName: string }[]; emailAddresses: { value: string }[] };
    }[];
  };

  if (!json.results) {
    return [];
  }

  return json.results.map((result) => ({
    // TODO: Greedily use the first name and email address for each contact for now
    name: result.person.names ? result.person.names[0].displayName : "",
    emailAddress: result.person.emailAddresses ? result.person.emailAddresses[0].value : "",
  }));
}

export async function getUserProfile(): Promise<{ name: string; email: string }> {
  const storedUserProfile = await LocalStorage.getItem("userProfile");
  if (storedUserProfile) {
    return JSON.parse(storedUserProfile as string);
  }

  const accessToken = (await client.getTokens())?.accessToken;
  const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("get user profile error:", await response.text());
    throw new Error(response.statusText);
  }

  const userProfile = (await response.json()) as { name: string; email: string };

  await LocalStorage.setItem("userProfile", JSON.stringify(userProfile));

  return userProfile;
}

export async function enrichLocation(searchText: string | PlaceInterface): Promise<PlaceInterface> {
  const googlePlacesTextSearchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.googleMapsUri",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify({
      textQuery: searchText,
    }),
  });

  const googlePlacesJson = (await googlePlacesTextSearchResponse.json()) as {
    places: { displayName: { text: string }; formattedAddress: string; googleMapsUri: string }[];
  };

  if (!googlePlacesJson.places) {
    return { displayName: { text: searchText.toString() }, formattedAddress: "", googleMapsUri: "" };
  }

  // TODO: Greedily use first place result for now
  return googlePlacesJson.places[0];
}

export async function createCalendarEvent(
  calendarEventDetails: CalendarEventDetails,
  contacts: Contact[],
): Promise<string> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const event = {
    summary: calendarEventDetails.eventTitle,
    start: {
      dateTime: calendarEventDetails.eventStart,
      timeZone: timeZone,
    },
    end: {
      dateTime: calendarEventDetails.eventEnd,
      timeZone: timeZone,
    },
    recurrence: [calendarEventDetails.eventRecurrence],
    location: calendarEventDetails.eventLocation,
    attendees: contacts.map((contact) => ({ email: contact.emailAddress })),
  };

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    console.error("create calendar event error:", await response.text());
    throw new Error(response.statusText);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdEvent: any = await response.json();
  return createdEvent.htmlLink; // Returns the link to the calendar event
}
