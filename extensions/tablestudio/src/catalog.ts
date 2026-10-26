import { getPreferenceValues, LocalStorage } from "@raycast/api";

/**
 * The catalog comes from TableStudio's local HTTP endpoint, not a file on disk: it lists the
 * user's connection, table, snippet and query names, and an unprotected file in Application
 * Support was readable by anything running as them. The endpoint is loopback-only and gated on a
 * bearer token, so nothing sits at rest on the TableStudio side.
 *
 * The cost is that the endpoint only answers while TableStudio runs, which is why we optionally
 * keep the last response in Raycast's own LocalStorage so search still works with the app closed.
 */

const SUPPORTED_SCHEMA_VERSION = 1;
const CACHE_KEY = "tablestudio.catalog";
export const CREDENTIALS_KEY = "tablestudio.credentials";
const REQUEST_TIMEOUT_MS = 4000;

/** Written by the `connect` command from TableStudio's one-click deeplink. */
export interface StoredCredentials {
  token: string;
  port: string;
}

interface Preferences {
  token?: string;
  port?: string;
  cacheResults?: boolean;
}

/**
 * Credentials come from the Connect button in TableStudio (LocalStorage) or, for anyone who
 * prefers setting it by hand, the extension's preferences. Both are returned, LocalStorage first
 * because it's the one that can be re-pushed with a fresh token from the app — but the caller
 * falls through to the next on a 401, so a stale stored token can't shadow a good manual one.
 */
async function resolveCredentials(preferences: Preferences): Promise<StoredCredentials[]> {
  const candidates: StoredCredentials[] = [];
  const raw = await LocalStorage.getItem<string>(CREDENTIALS_KEY);
  if (raw) {
    try {
      const stored = JSON.parse(raw) as StoredCredentials;
      if (stored.token) candidates.push({ token: stored.token, port: stored.port || "7432" });
    } catch {
      // Fall through to preferences rather than dying on a corrupt value.
    }
  }
  const token = preferences.token?.trim();
  if (token) {
    const manual = { token, port: preferences.port?.trim() || "7432" };
    if (!candidates.some((c) => c.token === manual.token && c.port === manual.port)) candidates.push(manual);
  }
  return candidates;
}

/** Tries each candidate in turn, moving on only when the token is rejected. */
async function fetchWithAny(candidates: StoredCredentials[]): Promise<CatalogPayload> {
  for (const [index, credentials] of candidates.entries()) {
    try {
      return await fetchCatalog(credentials);
    } catch (error) {
      const isLast = index === candidates.length - 1;
      if (isLast || !(error instanceof HttpError && error.kind === "unauthorized")) throw error;
    }
  }
  throw new HttpError("unauthorized");
}

export type SearchCategory = "connection" | "table" | "snippet" | "query" | "localDatabase";

/** A secondary action on a row, e.g. starting a stopped local server. */
export interface CatalogAction {
  title: string;
  /** The `tablestudio://` link that performs it. */
  id: string;
}

export interface CatalogItem {
  /** A `tablestudio://…` deep link, and the item's identity. */
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  keywords: string[];
  connectionID?: string;
  modifiedAt: string;
  /** SF Symbol name — informational; Raycast uses its own icon set. */
  icon: string;
  color?: string;
  /** Live state for display, e.g. a local database's "Running" / "Stopped". Localized by the app. */
  status?: string;
  /**
   * The same state as a stable English token — `running`, `starting`, `stopped`, `stopping`,
   * `ready`, `failed`. Branch on this, never on `status`, which is translated.
   */
  statusKind?: string;
  /** Extra actions beyond opening. */
  actions?: CatalogAction[];
}

interface CatalogPayload {
  schemaVersion: number;
  generatedAt: string;
  items: CatalogItem[];
}

/** Why the catalog couldn't be fetched, in terms a user can act on. */
export type CatalogError =
  | { kind: "notConnected" }
  | { kind: "unreachable" }
  | { kind: "unauthorized" }
  | { kind: "notPublished" }
  | { kind: "unsupportedVersion"; found: number }
  | { kind: "unreadable"; message: string };

export interface CatalogResult {
  items: CatalogItem[];
  generatedAt?: Date;
  /** True when these came from the cache because the endpoint couldn't be reached. */
  stale: boolean;
  error?: CatalogError;
}

/**
 * Persists credentials handed over by TableStudio's Connect button. Returns false when the
 * context carried nothing usable, so a normal command launch doesn't wipe a good token.
 */
export async function storeCredentials(incoming?: Partial<StoredCredentials>): Promise<boolean> {
  const token = incoming?.token?.trim();
  if (!token) return false;
  const credentials: StoredCredentials = {
    token,
    port: incoming?.port?.trim() || "7432",
  };
  await LocalStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  return true;
}

export async function loadCatalog(): Promise<CatalogResult> {
  const preferences = getPreferenceValues<Preferences>();
  const cacheAllowed = preferences.cacheResults !== false;

  // Honour the preference immediately: switching caching off should drop whatever was kept,
  // not just stop adding to it.
  if (!cacheAllowed) {
    await LocalStorage.removeItem(CACHE_KEY);
  }

  const candidates = await resolveCredentials(preferences);
  if (candidates.length === 0) {
    return { items: [], stale: false, error: { kind: "notConnected" } };
  }

  try {
    const payload = await fetchWithAny(candidates);

    if (payload.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
      return {
        items: [],
        stale: false,
        error: { kind: "unsupportedVersion", found: payload.schemaVersion },
      };
    }

    if (cacheAllowed) {
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    }

    return {
      items: payload.items ?? [],
      generatedAt: payload.generatedAt ? new Date(payload.generatedAt) : undefined,
      stale: false,
    };
  } catch (error) {
    const failure = classify(error);

    // A bad token or an out-of-date extension are real problems to surface — falling back to a
    // cache would just hide them. Only an unreachable app is worth serving stale results for.
    if (failure.kind === "unreachable" && cacheAllowed) {
      const cached = await readCache();
      if (cached) {
        return {
          items: cached.items ?? [],
          generatedAt: cached.generatedAt ? new Date(cached.generatedAt) : undefined,
          stale: true,
        };
      }
    }

    return { items: [], stale: false, error: failure };
  }
}

async function fetchCatalog(credentials: StoredCredentials): Promise<CatalogPayload> {
  // Aborts rather than hanging Raycast's list in a loading state if something is listening on
  // the port but never answers.
  const response = await fetch(`http://127.0.0.1:${credentials.port}/launcher-catalog`, {
    headers: { Authorization: `Bearer ${credentials.token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401) throw new HttpError("unauthorized");
  if (response.status === 503) throw new HttpError("notPublished");
  if (!response.ok) throw new HttpError("unreadable", `TableStudio returned ${response.status}.`);

  return (await response.json()) as CatalogPayload;
}

class HttpError extends Error {
  constructor(
    readonly kind: "unauthorized" | "notPublished" | "unreadable",
    message?: string,
  ) {
    super(message ?? kind);
  }
}

function classify(error: unknown): CatalogError {
  if (error instanceof HttpError) {
    if (error.kind === "unreadable") return { kind: "unreadable", message: error.message };
    return { kind: error.kind };
  }
  // Connection refused, abort, socket error — all mean "TableStudio isn't answering".
  return { kind: "unreachable" };
}

async function readCache(): Promise<CatalogPayload | undefined> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as CatalogPayload;
    return parsed.schemaVersion === SUPPORTED_SCHEMA_VERSION ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export const CATEGORY_TITLES: Record<SearchCategory, string> = {
  connection: "Connections",
  table: "Tables & Views",
  snippet: "Snippets",
  query: "Saved Queries",
  localDatabase: "Local Databases",
};

/**
 * Sort order only — never a list of what to render. TableStudio publishes a subset of these (it
 * has compile-time flags withholding snippets, saved queries and local databases), so anything
 * that renders from this constant instead of from the payload shows empty sections and has to be
 * re-edited every time the app changes its mind. Derive with `categoriesPresent` instead.
 */
export const CATEGORY_ORDER: SearchCategory[] = ["connection", "localDatabase", "table", "snippet", "query"];

/** The categories these items actually contain, in `CATEGORY_ORDER`. */
export function categoriesPresent(items: CatalogItem[]): SearchCategory[] {
  const present = new Set(items.map((item) => item.category));
  return CATEGORY_ORDER.filter((category) => present.has(category));
}
