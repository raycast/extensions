import { auth, calendar_v3 } from "@googleapis/calendar";
import { OAuthService, useCachedPromise, withAccessToken } from "@raycast/utils";
import { people_v1 } from "@googleapis/people";

let calendar: calendar_v3.Calendar | null = null;
let people: people_v1.People | null = null;

const google = OAuthService.google({
  clientId: "690234628480-4h8a6h78482ks82g3s1ghrqa0ce8qgo3.apps.googleusercontent.com",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scope:
    "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly https://www.googleapis.com/auth/userinfo.profile",
  onAuthorize({ token }) {
    const oauth = new auth.OAuth2();
    oauth.setCredentials({ access_token: token });

    calendar = new calendar_v3.Calendar({ auth: oauth });
    people = new people_v1.People({ auth: oauth });
  },
});

export function withGoogleAPIs<T>(ComponentOrFn: React.ComponentType<T> | ((params: T) => Promise<void> | void)) {
  return withAccessToken<T>(google)(ComponentOrFn);
}

function getCalendarClient() {
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

export function useContacts(query?: string) {
  return useCachedPromise(searchContacts, [query], {
    keepPreviousData: true,
  });
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
