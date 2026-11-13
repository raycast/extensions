import { createHash } from "node:crypto";
import { calendar_v3 } from "@googleapis/calendar";
import { getAccessToken, OAuthService, useCachedPromise, withAccessToken, withCache } from "@raycast/utils";
import { people_v1 } from "@googleapis/people";
import { getPreferenceValues, Tool } from "@raycast/api";
import { resolveCalendarIdForEventsList, resolveEventTypesForList } from "./event-types";
import { getClientId } from "./utils";
import { createGoogleClients } from "./google-clients";

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
    ({ calendar, people } = createGoogleClients(token));
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

// Keyed by a hash of the access token, so a new sign-in or a token refresh looks the account up once.
const getAccountIdForToken = withCache(async (tokenHash: string) => {
  void tokenHash;
  const response = await getPeopleClient().people.get({ resourceName: "people/me", personFields: "metadata" });
  const accountId = response.data.resourceName;
  if (!accountId) throw new Error("Could not identify the signed-in Google account.");
  return accountId;
});

/**
 * A stable ID for the signed-in Google account. Caches of account data include it in their key, so signing in to
 * another account never shows the previous account's contacts or events. Must run inside `withGoogleAPIs`.
 */
export async function getAccountKey() {
  const tokenHash = createHash("sha256").update(getAccessToken().token).digest("hex");
  return getAccountIdForToken(tokenHash);
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

  const [contactsResponse, otherContactsResponse] = await Promise.all([
    peopleClient.people.searchContacts({
      query: query ?? "",
      readMask: "names,emailAddresses,photos",
      sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
    }),
    peopleClient.otherContacts.search({
      readMask: "names,emailAddresses,photos",
      query: query ?? "",
    }),
  ]);
  const contacts = contactsResponse.data.results
    ?.map((contact) => contact.person)
    .filter(Boolean) as people_v1.Schema$Person[];
  const otherContacts = otherContactsResponse.data.results
    ?.map((contact) => contact.person)
    .filter(Boolean) as people_v1.Schema$Person[];

  return [...(contacts ?? []), ...(otherContacts ?? [])];
}

/**
 * Lists recently changed saved contacts for an empty search. Google needs an empty "warmup" search before prefix
 * searches return fresh results, so it is sent alongside.
 */
export async function listRecentContacts() {
  const peopleClient = getPeopleClient();
  const [response] = await Promise.all([
    peopleClient.people.connections.list({
      resourceName: "people/me",
      personFields: "names,emailAddresses,photos",
      sortOrder: "LAST_MODIFIED_DESCENDING",
      pageSize: 100,
    }),
    searchContacts("").catch(() => []),
  ]);
  return response.data.connections ?? [];
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

export function useEvents(calendarId?: string | null) {
  const { showBirthdays } = getPreferenceValues<Preferences.ListEvents>();

  return useCachedPromise(
    (calendarId?: string | null, showBirthdays?: boolean) =>
      async ({ cursor }) => {
        const calendar = getCalendarClient();
        const resolvedCalendarId = resolveCalendarIdForEventsList(calendarId);
        const eventTypes = resolveEventTypesForList({
          calendarId,
          showBirthdays: !!showBirthdays,
        });

        // Get recurring events and expanded instances in parallel
        const [recurringResponse, instancesResponse] = await Promise.all([
          calendar.events.list({
            calendarId: resolvedCalendarId,
            timeMin: new Date().toISOString(),
            maxResults: 50,
            singleEvents: false,
            eventTypes,
            pageToken: cursor?.recurringResponse,
          }),
          calendar.events.list({
            calendarId: resolvedCalendarId,
            timeMin: new Date().toISOString(),
            maxResults: 50,
            singleEvents: true,
            orderBy: "startTime",
            eventTypes,
            pageToken: cursor?.instanceResponse,
          }),
        ]);

        // Create a map of recurring event rules
        const recurringRules = new Map(
          recurringResponse.data.items?.map((event) => [
            event.id,
            {
              recurrence: event.recurrence,
              recurringEventId: event.recurringEventId,
            },
          ]),
        );

        const data = instancesResponse.data.items?.map((event) => {
          const recurringInfo = event.recurringEventId
            ? recurringRules.get(event.recurringEventId)
            : recurringRules.get(event.id);

          return {
            ...event,
            recurrence: recurringInfo?.recurrence, // RRULE string
            isRecurring: !!recurringInfo,
          };
        });

        const nextCursor = {
          instanceResponse: instancesResponse.data.nextPageToken,
          recurringResponse: recurringResponse.data.nextPageToken,
        };

        return {
          data: data ?? [],
          hasMore: nextCursor.instanceResponse !== undefined || nextCursor.recurringResponse !== undefined,
          cursor: nextCursor,
        };
      },
    [calendarId, showBirthdays],
    {
      keepPreviousData: true,
    },
  );
}
