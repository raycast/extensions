import { getPreferenceValues } from "@raycast/api";

export enum DocumentType {
  Web = 0,
  Local = 1,
  Remote = 2,
}

export type HisterDocument = {
  id?: string;
  url: string;
  domain: string;
  title: string;
  /** HTML-escaped fragment of the page text, matches wrapped in `<mark>`. */
  text: string;
  favicon_key?: string;
  added: number;
  updated: number;
  type: DocumentType;
  language?: string;
  label?: string;
  add_count?: number;
};

/** A page opened from, or pinned in Hister to, an earlier search. Pinned ones come first. */
export type HistoryEntry = {
  url: string;
  title: string;
  count: number;
  pinned: boolean;
  id?: string;
  domain?: string;
  added?: number;
  updated?: number;
};

export type SearchResults = {
  total: number;
  documents: HisterDocument[];
  history: HistoryEntry[];
  suggestion?: string;
};

export type Preview = {
  title: string;
  /** Sanitized HTML, except extractor templates such as "video" may send other formats. */
  content: string;
  template?: string;
  added?: number;
  version_count?: number;
};

/** `title` is a short heading; `message` is a full sentence the user (or Raycast AI) can act on. */
export class HisterError extends Error {
  constructor(
    readonly title: string,
    message: string,
  ) {
    super(message);
  }
}

const timeout = 15_000;

export function serverUrl(): string {
  const url = getPreferenceValues<Preferences>().serverUrl.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(url)) return url;
  return /^(localhost|127\.|\[::1\])/i.test(url) ? `http://${url}` : `https://${url}`;
}

function notHister(status?: number): HisterError {
  return new HisterError(
    "Hister not found",
    `${serverUrl()} didn't answer like a Hister server${status ? ` (${status})` : ""}. Set Server URL to the address of Hister's home page, and check that Hister and any tunnel or proxy in front of it are running.`,
  );
}

async function plainText(response: Response): Promise<string> {
  if (!response.headers.get("content-type")?.startsWith("text/plain")) return "";
  const text = (await response.text().catch(() => "")).trim();
  return text.length <= 300 ? text : "";
}

async function errorFor(response: Response, notFound?: HisterError): Promise<HisterError> {
  const { status } = response;
  const detail = await plainText(response);
  if (status === 401 || status === 403) {
    return getPreferenceValues<Preferences>().accessToken?.trim()
      ? new HisterError("Access token rejected", "Hister rejected the access token. Check it in the preferences.")
      : new HisterError("Access token needed", "This Hister server needs an access token. Add it in the preferences.");
  }
  // Hister answers its own 404s in plain text; an HTML 404 comes from something else at that address.
  if (status === 404) return detail && notFound ? notFound : notHister(status);
  if (status === 400) return new HisterError("Hister rejected the request", detail || "Hister rejected the request.");
  if (status >= 500) {
    return new HisterError(
      "Hister isn't responding",
      detail
        ? `Hister hit an error (${status}): ${detail}`
        : `${serverUrl()} returned ${status}. Hister, or a proxy in front of it, may be down.`,
    );
  }
  return new HisterError(`Hister returned ${status}`, detail || `${serverUrl()} returned ${status}.`);
}

async function request(path: string, init: RequestInit = {}, notFound?: HisterError): Promise<Response> {
  const token = getPreferenceValues<Preferences>().accessToken?.trim();
  const headers = new Headers(init.headers);
  // Without it Hister's CSRF check rejects token-authed POSTs. Its CLI's "Origin: hister://" breaks some reverse proxies.
  headers.set("Sec-Fetch-Site", "same-origin");
  headers.set("Accept", "application/json");
  if (token) headers.set("X-Access-Token", token);
  const signals = [AbortSignal.timeout(timeout), init.signal].filter((signal) => signal instanceof AbortSignal);

  let response: Response;
  try {
    response = await fetch(`${serverUrl()}${path}`, { ...init, headers, signal: AbortSignal.any(signals) });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new HisterError("Hister timed out", `${serverUrl()} took more than ${timeout / 1000} seconds to answer.`);
    }
    throw new HisterError(
      "Can't reach Hister",
      `Nothing answered at ${serverUrl()}. Check the Server URL, and that Hister is running.`,
    );
  }
  if (!response.ok) throw await errorFor(response, notFound);
  return response;
}

/** A proxy or Hister's own web app can answer 200 with an HTML page when Server URL is wrong. */
async function readJSON<T>(response: Response): Promise<T> {
  if (!response.headers.get("content-type")?.includes("json")) throw notHister();
  try {
    return (await response.json()) as T;
  } catch {
    throw notHister();
  }
}

function postJSON(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

/** `sort` goes in its own field: Hister matches pins and opened pages on the exact query text. */
export async function search(
  text: string,
  { limit, sort, signal }: { limit: number; sort?: string; signal?: AbortSignal },
): Promise<SearchResults> {
  const query = JSON.stringify({ text, limit, sort, highlight: "HTML" });
  const response = await request(`/search?format=json&query=${encodeURIComponent(query)}`, { signal });
  const body = await readJSON<{
    total?: number;
    documents?: HisterDocument[] | null;
    history?: HistoryEntry[] | null;
    query_suggestion?: string;
  }>(response);
  return {
    total: body.total ?? 0,
    documents: body.documents ?? [],
    history: body.history ?? [],
    suggestion: body.query_suggestion || undefined,
  };
}

/** `searchedAt` is the last use, in Unix seconds. */
export type RecentSearch = { query: string; searchedAt: number };

/** Hister records a search only once a result is opened from it. Newest first. */
export async function getRecentSearches(): Promise<RecentSearch[]> {
  const response = await request("/api/history?opened=true");
  const body = await readJSON<{ documents?: { query?: string; added?: number }[] | null }>(response);
  const recent: RecentSearch[] = [];
  for (const item of body.documents ?? []) {
    const query = item.query?.trim();
    if (query && !recent.some((search) => search.query === query)) recent.push({ query, searchedAt: item.added ?? 0 });
  }
  return recent;
}

export async function getPreview(url: string, documentId?: string): Promise<Preview> {
  const params = new URLSearchParams({ url });
  if (documentId) params.set("document_id", documentId);
  const notStored = new HisterError("Page not stored", `Hister has no stored copy of ${url}.`);
  const response = await request(`/api/preview?${params}`, {}, notStored);
  return readJSON<Preview>(response);
}

export async function getFavicon(key: string): Promise<string> {
  const response = await request(`/api/favicon?key=${encodeURIComponent(key)}`);
  const type = response.headers.get("content-type")?.split(";")[0].trim() || "image/png";
  return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
}

/** Makes `url` rank first the next time `query` is searched, as opening it in the Hister web UI does. */
export async function recordOpen(query: string, url: string, title: string): Promise<void> {
  await postJSON("/api/history", { query, url, title }, AbortSignal.timeout(2000));
}

export async function deleteDocument(url: string): Promise<number> {
  const response = await postJSON("/api/delete", { query: `url:"${url.replaceAll('"', '\\"')}"` });
  const body = await readJSON<{ deleted?: number }>(response);
  return body.deleted ?? 0;
}

/** `url_re:` matches the same way Hister's indexing rules do, so it selects exactly what a skip rule covers. */
export function urlPatternQuery(pattern: string): string {
  return `url_re:"${pattern.replaceAll('"', '\\"')}"`;
}

export async function countQueryMatches(query: string, signal?: AbortSignal): Promise<number> {
  const response = await postJSON("/api/delete", { query, dry_run: true }, signal);
  const body = await readJSON<{ matched?: number }>(response);
  return body.matched ?? 0;
}

export function countPatternMatches(pattern: string, signal?: AbortSignal): Promise<number> {
  return countQueryMatches(urlPatternQuery(pattern), signal);
}

export async function deletePatternMatches(pattern: string): Promise<number> {
  const response = await postJSON("/api/delete", { query: urlPatternQuery(pattern) });
  const body = await readJSON<{ deleted?: number }>(response);
  return body.deleted ?? 0;
}

/** Older Hister servers have no allow group. */
export type Rules = { lists: Record<string, string[]>; aliases: Record<string, string> };

export async function getRules(): Promise<Rules> {
  const body = await readJSON<Record<string, unknown>>(await request("/api/rules"));
  const lists = Object.entries(body)
    .filter(([, value]) => value === null || Array.isArray(value))
    .map(([name, value]) => [name, (value as string[] | null) ?? []]);
  return { lists: Object.fromEntries(lists), aliases: (body.aliases as Record<string, string> | null) ?? {} };
}

// Every group goes back, as Hister's web page does, in case the server resets groups a save omits.
async function saveRuleLists(lists: Record<string, string[]>): Promise<void> {
  const form = new URLSearchParams(
    Object.fromEntries(Object.entries(lists).map(([name, patterns]) => [name, patterns.join("\n")])),
  );
  await request("/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
}

/** Returns false when the rule was already there. */
export async function addSkipRule(pattern: string): Promise<boolean> {
  const { lists } = await getRules();
  const skip = lists.skip ?? [];
  if (skip.includes(pattern)) return false;
  await saveRuleLists({ ...lists, skip: [...skip, pattern] });
  return true;
}

export async function removeRule(group: string, pattern: string): Promise<void> {
  const { lists } = await getRules();
  await saveRuleLists({ ...lists, [group]: (lists[group] ?? []).filter((existing) => existing !== pattern) });
}

/** Replaces the query of an existing alias with the same keyword. */
export async function addAlias(keyword: string, query: string): Promise<void> {
  await request("/api/add_alias", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ "alias-keyword": keyword, "alias-value": query }),
  });
}

export async function removeAlias(alias: string): Promise<void> {
  await request("/api/delete_alias", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ alias }),
  });
}

export function webSearchUrl(query: string): string {
  return `${serverUrl()}/?q=${encodeURIComponent(query)}`;
}
