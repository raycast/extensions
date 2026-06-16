import { Cache, getPreferenceValues } from "@raycast/api";
import { stripTags } from "./urls";

// Pure URL builders / parsers / text helpers live in ./urls (no Raycast import, so
// they're unit-testable). Re-export them so callers can keep importing from "./kagi".
export * from "./urls";

const KAGI = "https://kagi.com";

// ---- API token (the v1 Bearer token from kagi.com/api/keys; Search command only) ---

function token(): string {
  return (getPreferenceValues<{ apiToken?: string }>().apiToken ?? "").trim();
}

export function hasToken(): boolean {
  return token().length > 0;
}

const NO_TOKEN =
  "No Kagi API token set. Add one in this command's preferences (generate at kagi.com/api/keys).";

async function kagiJson(url: string, init: RequestInit): Promise<{ data?: unknown }> {
  const res = await fetch(url, init);
  const body = await res.text();
  let json: { data?: unknown; error?: unknown; errors?: unknown };
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`Kagi returned a non-JSON response (HTTP ${res.status}).`);
  }
  // v0 errors are under `error` ([{code, msg}]); v1 under `errors` ([{code, message}]).
  const errs = json.error ?? json.errors;
  if (errs) {
    const arr = Array.isArray(errs) ? errs : [errs];
    const msg = arr
      .map((e) => (typeof e === "string" ? e : (e?.msg ?? e?.message ?? JSON.stringify(e))))
      .join("; ");
    throw new Error(msg || `Kagi error (HTTP ${res.status}).`);
  }
  if (!res.ok) throw new Error(`Kagi error (HTTP ${res.status}).`);
  return json;
}

// ---- v1 Search API (paid, Bearer) ----------

export interface SearchResult {
  url: string;
  title: string;
  snippet?: string;
  published?: string;
  thumbnail?: string;
}

function toResult(d: Record<string, unknown>): SearchResult {
  const thumb = (d.thumbnail ?? d.image) as { url?: string } | undefined;
  const turl = thumb?.url;
  const published = (d.published ?? d.time) as string | undefined;
  return {
    url: String(d.url ?? ""),
    title: stripTags(String(d.title ?? d.url ?? "")),
    snippet: d.snippet ? String(d.snippet) : undefined,
    published: published ? String(published) : undefined,
    thumbnail: turl ? (turl.startsWith("http") ? turl : KAGI + turl) : undefined,
  };
}

// Handle BOTH response shapes: legacy flat `data: [{t:0,...}]` and v1 named-category
// `data: { search: [...] }`. (The live wire vs the OpenAPI spec disagree on this.)
function extractResults(json: { data?: unknown }): SearchResult[] {
  const data = json.data;
  let items: Record<string, unknown>[] = [];
  if (Array.isArray(data)) {
    items = (data as Record<string, unknown>[]).filter((d) => d.t === 0);
  } else if (data && typeof data === "object") {
    const search = (data as Record<string, unknown>).search;
    if (Array.isArray(search)) items = search as Record<string, unknown>[];
  }
  return items.filter((d) => d.url).map(toResult);
}

export async function kagiSearch(query: string, limit = 10): Promise<SearchResult[]> {
  if (!hasToken()) throw new Error(NO_TOKEN);
  const json = await kagiJson(`${KAGI}/api/v1/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
  });
  return extractResults(json);
}

// ---- Bangs catalog (free, cached) --------------------------------------------

export interface Bang {
  t: string; // trigger
  s: string; // site name
  d?: string; // domain
  ts?: string[]; // alternate triggers
  c?: string; // category
}

const BANGS_URL = "https://raw.githubusercontent.com/kagisearch/bangs/main/data/bangs.json";
const cache = new Cache();
const TTL = 7 * 24 * 60 * 60 * 1000; // refresh weekly (catalog updates ~weekly)

export async function getBangs(): Promise<Bang[]> {
  const ts = Number(cache.get("bangs-ts") ?? 0);
  const cached = cache.get("bangs-json");
  if (cached && Date.now() - ts < TTL) {
    try {
      return JSON.parse(cached) as Bang[];
    } catch {
      /* fall through and refetch */
    }
  }
  const res = await fetch(BANGS_URL);
  const all = (await res.json()) as Record<string, unknown>[];
  const bangs: Bang[] = all
    .filter((b) => b?.t && b?.s)
    .map((b) => ({
      t: String(b.t),
      s: String(b.s),
      d: b.d ? String(b.d) : undefined,
      ts: Array.isArray(b.ts) ? (b.ts as string[]) : undefined,
      c: b.c ? String(b.c) : undefined,
    }));
  cache.set("bangs-json", JSON.stringify(bangs));
  cache.set("bangs-ts", String(Date.now()));
  return bangs;
}
