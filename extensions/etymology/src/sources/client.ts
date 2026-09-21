// Every outbound request goes through here. Owns the Wikimedia User-Agent
// (policy requires "<client>/<version> (<contact>)" and the word "bot"; generic
// agents are blocked without notice), timeouts, and 429 backoff.

const API = "https://en.wiktionary.org/w/api.php";
const REST = "https://en.wiktionary.org/w/rest.php/v1";

const USER_AGENT = "raycast-etymology/1.0 (bot; https://github.com/raycast/extensions/tree/main/extensions/etymology)";

const TIMEOUT_MS = 15_000;
const RETRIES = 2;

export class NotFoundError extends Error {
  constructor(title: string) {
    super(`No Wiktionary page for "${title}"`);
    this.name = "NotFoundError";
  }
}

async function request(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // 429 carries Retry-After; 5xx is worth one blind retry. Anything else is
    // ours to deal with, not the network's.
    if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
      const after = Number(res.headers.get("Retry-After"));
      const waitMs = Number.isFinite(after) && after > 0 ? after * 1000 : 400 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) throw new Error(`Wiktionary returned ${res.status} ${res.statusText}`);
    return res;
  }
}

interface ParseResponse<T> {
  parse?: T;
  error?: { code: string; info: string };
}

async function parse<T>(title: string, prop: string, extra: Record<string, string> = {}): Promise<T> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop,
    format: "json",
    formatversion: "2",
    redirects: "1",
    ...extra,
  });

  const body = (await (await request(`${API}?${params}`)).json()) as ParseResponse<T>;

  if (body.error) {
    if (body.error.code === "missingtitle") throw new NotFoundError(title);
    throw new Error(body.error.info);
  }
  if (!body.parse) throw new NotFoundError(title);
  return body.parse;
}

export function fetchWikitext(title: string): Promise<string> {
  return parse<{ wikitext: string }>(title, "wikitext").then((p) => p.wikitext);
}

export function fetchHtml(title: string): Promise<string> {
  return parse<{ text: string }>(title, "text").then((p) => p.text);
}

export interface TitleSuggestion {
  title: string;
  description?: string;
}

export async function searchTitles(query: string, limit = 15): Promise<TitleSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const body = (await (await request(`${REST}/search/title?${params}`)).json()) as {
    pages?: { title: string; description?: string | null }[];
  };
  return (body.pages ?? []).map((p) => ({
    title: p.title,
    description: p.description ?? undefined,
  }));
}

/**
 * Resolve a language code that postdates the bundled assets/langcodes.json.
 * One request, and only for codes we could not name locally.
 */
export async function expandLanguageName(code: string): Promise<string | undefined> {
  const params = new URLSearchParams({
    action: "expandtemplates",
    prop: "wikitext",
    format: "json",
    formatversion: "2",
    text: `{{#invoke:languages/templates|getByCode|${code}|getCanonicalName}}`,
  });

  try {
    const body = (await (await request(`${API}?${params}`)).json()) as {
      expandtemplates?: { wikitext?: string };
    };
    const name = body.expandtemplates?.wikitext?.trim();
    return name && !name.startsWith("<") ? name : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A random entry that is known to have a tree. Special:RandomInCategory answers
 * with a 302 to the chosen page, so the title comes from the resolved URL rather
 * than the body. The category holds roughly 46,000 English entries.
 */
export async function randomTermWithTree(): Promise<string> {
  const url = "https://en.wiktionary.org/wiki/Special:RandomInCategory/Category:English_entries_with_etymology_trees";

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Wiktionary returned ${res.status} ${res.statusText}`);

  const title = decodeURIComponent(new URL(res.url).pathname.replace(/^\/wiki\//, ""));
  if (!title) throw new Error("Wiktionary did not name a random entry");
  return title.replace(/_/g, " ");
}

export function pageUrl(title: string, lang = "English"): string {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(title)}#${encodeURIComponent(lang)}`;
}
