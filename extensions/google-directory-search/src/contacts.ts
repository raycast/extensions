import { LocalStorage } from "@raycast/api";

/** A single contact, flattened from the Google People API into what we paste. */
export type Contact = {
  /** People API `resourceName`, e.g. `people/c123`. Stable id used for merging. */
  id: string;
  /** Display name (Google composes this as "Given Family"). May be empty. */
  name: string;
  givenName?: string;
  familyName?: string;
  /** Email addresses, primary first. May be empty. */
  emails: string[];
};

/** Everything we persist between launches: the contacts plus the sync cursors. */
export type ContactStore = {
  contacts: Contact[];
  /** People API sync token enabling incremental refreshes (changes only). */
  syncToken?: string;
  /** Org directory profiles (the user's Workspace domain). */
  directory: Contact[];
  /** Sync token for the directory source. */
  directorySyncToken?: string;
};

/** Map of contact id to the timestamp (ms) it was last pasted/copied. */
export type Usage = Record<string, number>;

/** Set of pinned contact ids (favorites), kept at the top of the list. */
export type Favorites = Record<string, true>;

const PERSON_FIELDS = "names,emailAddresses";
const PAGE_SIZE = "1000";

const CONTACTS_KEY = "contacts";
const SYNC_TOKEN_KEY = "syncToken";
const DIRECTORY_KEY = "directory";
const DIRECTORY_SYNC_TOKEN_KEY = "directorySyncToken";
const USAGE_KEY = "usage";
const FAVORITES_KEY = "favorites";

/** Describes one People API source (personal connections vs. org directory). */
type SourceConfig = {
  url: string;
  /** Connections uses `personFields`; the directory endpoint uses `readMask`. */
  fieldParam: "personFields" | "readMask";
  /** Connections returns `connections`; the directory returns `people`. */
  resultKey: "connections" | "people";
  /** Extra query params (the directory must declare its source type). */
  extra?: Record<string, string>;
};

const PERSONAL: SourceConfig = {
  url: "https://people.googleapis.com/v1/people/me/connections",
  fieldParam: "personFields",
  resultKey: "connections",
};

const DIRECTORY: SourceConfig = {
  url: "https://people.googleapis.com/v1/people:listDirectoryPeople",
  fieldParam: "readMask",
  resultKey: "people",
  // Workspace user profiles only (DOMAIN_PROFILE). We deliberately exclude
  // DOMAIN_CONTACT (admin-shared external contacts) to keep results to real
  // colleagues. Supports incremental sync tokens just like personal connections.
  extra: { sources: "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE" },
};

class PeopleApiError extends Error {
  status: number;
  isExpiredSyncToken: boolean;

  constructor(status: number, body: string) {
    super(`Google People API error ${status}: ${body}`);
    this.name = "PeopleApiError";
    this.status = status;
    // A stale sync token is reported as 410 GONE or a 400 with this reason.
    this.isExpiredSyncToken = status === 410 || body.includes("EXPIRED_SYNC_TOKEN");
  }
}

type Person = {
  resourceName: string;
  metadata?: { deleted?: boolean };
  names?: {
    displayName?: string;
    givenName?: string;
    familyName?: string;
    metadata?: { primary?: boolean };
  }[];
  emailAddresses?: { value?: string; metadata?: { primary?: boolean } }[];
};

type PeopleResponse = {
  connections?: Person[];
  people?: Person[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

async function fetchPage(
  url: string,
  token: string,
  params: URLSearchParams,
): Promise<PeopleResponse> {
  const response = await fetch(`${url}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new PeopleApiError(response.status, await response.text());
  }
  return (await response.json()) as PeopleResponse;
}

function toContact(person: Person): Contact {
  const names = person.names ?? [];
  const primaryName = names.find((n) => n.metadata?.primary) ?? names[0];
  const emails = (person.emailAddresses ?? [])
    .filter((e): e is { value: string; metadata?: { primary?: boolean } } => Boolean(e.value))
    // Primary email first, otherwise keep Google's order.
    .sort((a, b) => Number(b.metadata?.primary ?? false) - Number(a.metadata?.primary ?? false))
    .map((e) => e.value);

  return {
    id: person.resourceName,
    name: primaryName?.displayName ?? "",
    givenName: primaryName?.givenName,
    familyName: primaryName?.familyName,
    emails,
  };
}

type SourceState = { contacts: Contact[]; syncToken?: string };

/**
 * Sync one People API source.
 *
 * If `previous.syncToken` is set, only changes (additions, edits, deletions)
 * since that token are fetched and merged into `previous.contacts`. Otherwise a
 * full list is fetched. Either way we request a fresh sync token for next time.
 */
async function syncSource(
  token: string,
  config: SourceConfig,
  previous: SourceState,
): Promise<SourceState> {
  const byId = new Map(previous.contacts.map((c) => [c.id, c]));
  let pageToken: string | undefined;
  let syncToken = previous.syncToken;

  do {
    const params = new URLSearchParams({
      [config.fieldParam]: PERSON_FIELDS,
      pageSize: PAGE_SIZE,
      requestSyncToken: "true",
      ...config.extra,
    });
    // Every page must repeat the first call's parameters.
    if (previous.syncToken) params.set("syncToken", previous.syncToken);
    if (pageToken) params.set("pageToken", pageToken);

    const data = await fetchPage(config.url, token, params);
    for (const person of data[config.resultKey] ?? []) {
      if (person.metadata?.deleted) {
        byId.delete(person.resourceName);
      } else {
        byId.set(person.resourceName, toContact(person));
      }
    }

    pageToken = data.nextPageToken;
    // The sync token only arrives on the final page.
    if (data.nextSyncToken) syncToken = data.nextSyncToken;
  } while (pageToken);

  const contacts = [...byId.values()].filter((c) => c.name || c.emails.length > 0);
  return { contacts, syncToken };
}

/** Sync a source, transparently re-syncing in full if its sync token expired. */
async function syncSourceResilient(
  token: string,
  config: SourceConfig,
  previous: SourceState,
): Promise<SourceState> {
  try {
    return await syncSource(token, config, previous);
  } catch (error) {
    if (previous.syncToken && error instanceof PeopleApiError && error.isExpiredSyncToken) {
      return await syncSource(token, config, { contacts: previous.contacts });
    }
    throw error;
  }
}

/**
 * Sync both personal contacts and the org directory with Google.
 *
 * Pass a store without sync tokens to force a full refresh of either source.
 * Directory listing can be unavailable (non-Workspace org, directory sharing
 * off); that failure is non-fatal and keeps whatever directory we had.
 */
export async function syncContacts(token: string, previous: ContactStore): Promise<ContactStore> {
  const personal = await syncSourceResilient(token, PERSONAL, {
    contacts: previous.contacts,
    syncToken: previous.syncToken,
  });

  let directory: SourceState = {
    contacts: previous.directory,
    syncToken: previous.directorySyncToken,
  };
  try {
    directory = await syncSourceResilient(token, DIRECTORY, directory);
  } catch (error) {
    console.error("Directory sync failed; keeping previous directory.", error);
  }

  return {
    contacts: personal.contacts,
    syncToken: personal.syncToken,
    directory: directory.contacts,
    directorySyncToken: directory.syncToken,
  };
}

/** Personal contacts plus directory profiles not already known by email. */
export function allContacts(store: ContactStore): Contact[] {
  const seen = new Set(store.contacts.flatMap((c) => c.emails.map((e) => e.toLowerCase())));
  const extra = store.directory.filter((c) => !c.emails.some((e) => seen.has(e.toLowerCase())));
  return [...store.contacts, ...extra];
}

/**
 * Sort favorites first, then by most-recently-used (usage timestamp desc),
 * then alphabetically.
 */
export function sortContacts(contacts: Contact[], usage: Usage, favorites: Favorites): Contact[] {
  return [...contacts].sort((a, b) => {
    const fa = favorites[a.id] ? 1 : 0;
    const fb = favorites[b.id] ? 1 : 0;
    if (fa !== fb) return fb - fa;
    const ua = usage[a.id] ?? 0;
    const ub = usage[b.id] ?? 0;
    if (ua !== ub) return ub - ua;
    return a.name.localeCompare(b.name);
  });
}

export async function loadStore(): Promise<ContactStore> {
  const [contacts, syncToken, directory, directorySyncToken] = await Promise.all([
    LocalStorage.getItem<string>(CONTACTS_KEY),
    LocalStorage.getItem<string>(SYNC_TOKEN_KEY),
    LocalStorage.getItem<string>(DIRECTORY_KEY),
    LocalStorage.getItem<string>(DIRECTORY_SYNC_TOKEN_KEY),
  ]);
  return {
    contacts: contacts ? (JSON.parse(contacts) as Contact[]) : [],
    syncToken,
    directory: directory ? (JSON.parse(directory) as Contact[]) : [],
    directorySyncToken,
  };
}

export async function saveStore(store: ContactStore): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(CONTACTS_KEY, JSON.stringify(store.contacts)),
    LocalStorage.setItem(DIRECTORY_KEY, JSON.stringify(store.directory)),
    store.syncToken
      ? LocalStorage.setItem(SYNC_TOKEN_KEY, store.syncToken)
      : LocalStorage.removeItem(SYNC_TOKEN_KEY),
    store.directorySyncToken
      ? LocalStorage.setItem(DIRECTORY_SYNC_TOKEN_KEY, store.directorySyncToken)
      : LocalStorage.removeItem(DIRECTORY_SYNC_TOKEN_KEY),
  ]);
}

export async function loadUsage(): Promise<Usage> {
  const raw = await LocalStorage.getItem<string>(USAGE_KEY);
  return raw ? (JSON.parse(raw) as Usage) : {};
}

export async function saveUsage(usage: Usage): Promise<void> {
  await LocalStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

export async function loadFavorites(): Promise<Favorites> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
  return raw ? (JSON.parse(raw) as Favorites) : {};
}

export async function saveFavorites(favorites: Favorites): Promise<void> {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}
