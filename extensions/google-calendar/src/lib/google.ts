import { auth, calendar_v3 } from "@googleapis/calendar";
import { OAuthService, useCachedPromise, withAccessToken, withCache } from "@raycast/utils";
import { people_v1 } from "@googleapis/people";
import { Tool } from "@raycast/api";
import { getClientId } from "./utils";

let calendar: calendar_v3.Calendar | null = null;
let people: people_v1.People | null = null;

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/contacts.other.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
] as const;

const google = OAuthService.google({
  // Google Cloud Project: https://ray.so/6eAXUYf
  clientId: getClientId(),
  scope: GOOGLE_OAUTH_SCOPES.join(" "),
  onAuthorize({ token }) {
    const oauth = new auth.OAuth2();
    oauth.setCredentials({ access_token: token });

    calendar = new calendar_v3.Calendar({ auth: oauth });
    people = new people_v1.People({ auth: oauth });
  },
});

export function getCalendarClient() {
  if (!calendar) {
    throw new Error("No Google Calendar client initialized");
  }

  return calendar;
}

export function getPeopleClient() {
  if (!people) {
    throw new Error("No Google People client initialized");
  }

  return people;
}

export function withGoogleAPIs<Input, Output>(
  ComponentOrFn: React.ComponentType<Input> | ((params: Input) => Promise<Output> | Output) | Tool.Confirmation<Input>,
) {
  return withAccessToken<Input>(google)(ComponentOrFn);
}

export function useGoogleAPIs() {
  return {
    get calendar() {
      return getCalendarClient();
    },
    get people() {
      return getPeopleClient();
    },
  };
}

export async function searchContacts(query?: string) {
  const peopleClient = getPeopleClient();

  const contactsResponse = await peopleClient.people.searchContacts({
    query: query ?? "",
    readMask: "names,emailAddresses,photos",
    sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
  });
  const contacts = contactsResponse.data.results
    ?.map((contact) => contact.person)
    .filter(Boolean) as people_v1.Schema$Person[];

  const otherContactsResponse = await peopleClient.otherContacts.search({
    readMask: "names,emailAddresses,photos",
    query: query ?? "",
  });
  const otherContacts = otherContactsResponse.data.results
    ?.map((contact) => contact.person)
    .filter(Boolean) as people_v1.Schema$Person[];

  return [...(contacts ?? []), ...(otherContacts ?? [])];
}

export async function getAutoAddHangouts() {
  const cachedFunction = withCache(async () => {
    const calendar = getCalendarClient();
    const settings = await calendar.settings.get({ setting: "autoAddHangouts" });
    return settings.data.value === "true";
  });
  return await cachedFunction();
}

export function useContacts(query?: string) {
  return useCachedPromise(searchContacts, [query], {
    keepPreviousData: true,
  });
}

export function useCalendar(calendarId: string) {
  return useCachedPromise(
    async (calendarId: string) => {
      const calendar = getCalendarClient();
      return await calendar.calendars.get({ calendarId });
    },
    [calendarId],
  );
}

export function useCalendars() {
  return useCachedPromise(
    async () => {
      const calendar = getCalendarClient();
      const response = await calendar.calendarList.list();
      return response.data.items ?? [];
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}
