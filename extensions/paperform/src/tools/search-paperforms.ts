import { getPreferenceValues, LocalStorage } from "@raycast/api";

type Preferences = { apiKey: string };

type Input = {
  /** Natural‑language query, e.g. "forms with more than 30 submissions". Optional if you provide structured fields below. */
  query?: string;
  /** Max number of results to return (default 50, max 100). */
  limit?: number;
  /** If user searches for a specific named form(s), pass the phrase here (do NOT include numeric-only terms). */
  searchTerm?: string;
  /** Filter forms created strictly before this ISO date (UTC), e.g. "2022-01-01". */
  beforeDate?: string;
  /** Filter forms created on/after this ISO date (UTC). */
  afterDate?: string;
  /** Relative age filter. Example: { value: 1, unit: "years" } */
  olderThan?: { value: number; unit: "days" | "months" | "years" };
  /** Minimum number of submissions (strictly greater than). */
  minSubmissions?: number;
  /** Maximum number of submissions (less than or equal). */
  maxSubmissions?: number;
  /** Require any submissions (> 0). */
  requireAnySubmissions?: boolean;
  /** If true, return only an array of IDs alongside items. */
  returnIdsOnly?: boolean; // Interpreted as slugs-only in output for user clarity
  /** Sort hint. API supports created_at ASC/DESC; submissions_* are applied client‑side. */
  sort?: "created_desc" | "created_asc" | "submissions_desc" | "submissions_asc";
};

type PaperformForm = {
  slug?: string;
  custom_slug?: string | null;
  name?: string;
  title?: string;
  url?: string;
  created_at?: string;
  created_at_utc?: string;
  updated_at?: string;
  updated_at_utc?: string;
  submission_count?: number;
};

const API_BASE = "https://api.paperform.co/v1";
const PAGE_LIMIT = 100;

/**
 * Search Paperform forms with natural language.
 * Examples:
 * - "latest forms with submissions"
 * - "forms created before 2022"
 * - "forms with more than 30 submissions"
 * - "most popular forms"
 * - "what form IDs are older than 1 year and have no submissions?"
 */
/**
 * Search Paperform forms using natural language or structured filters.
 * Prefer filling structured fields (beforeDate, afterDate, minSubmissions, sort, etc.).
 * Only set searchTerm when the user is looking for a specific named form or keyword (not numeric constraints).
 */
export default async function tool(input: Input) {
  const apiKey = await getApiKey();
  const limit = Math.min(Math.max(1, input.limit ?? 50), 100);
  const parsed = mergeParsed(parseQuery(input.query || ""), input);

  const all = await fetchAllForms(apiKey, parsed);
  const filtered = applyFilters(all, parsed);
  const sorted = applySort(filtered, parsed);
  const top = sorted.slice(0, limit);

  const items = top.map((f) => simplify(f));
  const slugsOnly = parsed.returnIdsOnly
    ? items.map((i) => i.slug).filter((s): s is string => typeof s === "string" && s.length > 0)
    : undefined;
  const slugsPlain = slugsOnly ? slugsOnly.join("\n") : undefined;

  return {
    summary: buildSummary(parsed, items.length, filtered.length, all.length),
    items: parsed.returnIdsOnly ? [] : items,
    slugs: slugsOnly,
    slugsPlain,
    presentation: parsed.returnIdsOnly ? "slugs_only" : "list",
    counts: { shown: items.length, filtered: filtered.length, scanned: all.length },
  };
}

// -------------------- Fetch helpers --------------------

async function apiFetch<T>(apiKey: string, path: string, retries = 1): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res.status === 429 && retries > 0) {
    const retryAfter = res.headers.get("Retry-After");
    const waitMs = (retryAfter ? Number(retryAfter) : 1) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
    return apiFetch<T>(apiKey, path, retries - 1);
  }
  if (res.status === 401) throw new Error("Unauthorized: Check your Paperform API key in Raycast preferences");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function getApiKey(): Promise<string> {
  try {
    const { apiKey } = getPreferenceValues<Preferences>();
    if (apiKey && String(apiKey).trim()) return String(apiKey).trim();
  } catch {
    // ignore, fallback to local storage
  }
  const stored = await LocalStorage.getItem<string>("paperform_api_key");
  if (stored && stored.trim()) return stored.trim();
  throw new Error("Missing Paperform API key. Open the Search Paperforms command preferences and set your API Key.");
}

async function fetchAllForms(apiKey: string, parsed: ParsedQuery) {
  const out: PaperformForm[] = [];
  let skip = 0;
  // Fetch up to 1000 to keep responsiveness
  const hardMax = 1000;
  while (skip < hardMax) {
    const params: string[] = [`limit=${PAGE_LIMIT}`, `skip=${skip}`];
    if (parsed.searchTerm) params.push(`search=${encodeURIComponent(parsed.searchTerm)}`);
    if (parsed.createdBefore) params.push(`before_date=${encodeURIComponent(parsed.createdBefore.toISOString())}`);
    if (parsed.createdAfter) params.push(`after_date=${encodeURIComponent(parsed.createdAfter.toISOString())}`);
    if (parsed.sort === "created_asc") params.push("sort=ASC");
    if (parsed.sort === "created_desc") params.push("sort=DESC");
    const path = `/forms?${params.join("&")}`;
    const data = await apiFetch<unknown>(apiKey, path);
    const page = extractForms(data);
    if (!page.length) break;
    for (const f of page) out.push(f);
    const hasMore = extractHasMore(data);
    if (!hasMore) break;
    skip += PAGE_LIMIT;
  }
  // Deduplicate by slug
  const map = new Map<string, PaperformForm>();
  for (const f of out) map.set(f.slug || "", f);
  return Array.from(map.values());
}

function extractForms(input: unknown): PaperformForm[] {
  if (Array.isArray(input)) return input as PaperformForm[];
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const data = obj["data"];
    const results = obj["results"] as Record<string, unknown> | undefined;
    if (Array.isArray(data)) return data as PaperformForm[];
    if (data && typeof data === "object") {
      const maybeForms = (data as Record<string, unknown>)["forms"];
      if (Array.isArray(maybeForms)) return maybeForms as PaperformForm[];
    }
    if (Array.isArray(obj["forms"])) return obj["forms"] as PaperformForm[];
    if (results && Array.isArray(results["forms"])) return results["forms"] as PaperformForm[];
  }
  return [];
}

function extractHasMore(input: unknown): boolean | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as Record<string, unknown>;
  const tryBool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
  const direct = tryBool(obj["has_more"]);
  if (typeof direct === "boolean") return direct;
  const data = obj["data"];
  if (data && typeof data === "object") {
    const v = (data as Record<string, unknown>)["has_more"];
    if (typeof v === "boolean") return v;
  }
  const results = obj["results"];
  if (results && typeof results === "object") {
    const v = (results as Record<string, unknown>)["has_more"];
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

// -------------------- Query parsing & filtering --------------------

type ParsedQuery = {
  searchTerm?: string;
  createdBefore?: Date;
  createdAfter?: Date;
  olderThanMs?: number;
  minSubmissions?: number;
  maxSubmissions?: number;
  requireAnySubmissions?: boolean;
  returnIdsOnly?: boolean;
  sort?: "created_desc" | "created_asc" | "submissions_desc" | "submissions_asc";
};

function parseQuery(q: string): ParsedQuery {
  const query = (q || "").toLowerCase();
  const parsed: ParsedQuery = {};

  // Free-text search term: prefer quoted phrase, otherwise keywords that are not numeric or stopwords
  parsed.searchTerm = deriveSearchTerm(query);

  // Dates
  const beforeMatch = query.match(/before\s+(\d{4}(?:-\d{1,2}(?:-\d{1,2})?)?)/);
  if (beforeMatch) parsed.createdBefore = new Date(beforeMatch[1]);
  const afterMatch = query.match(/after\s+(\d{4}(?:-\d{1,2}(?:-\d{1,2})?)?)/);
  if (afterMatch) parsed.createdAfter = new Date(afterMatch[1]);
  const olderMatch = query.match(/older than\s+(\d+)\s+(year|years|month|months|day|days)/);
  if (olderMatch) {
    const n = Number(olderMatch[1]);
    const unit = olderMatch[2].startsWith("year") ? 365 : olderMatch[2].startsWith("month") ? 30 : 1;
    parsed.olderThanMs = n * unit * 24 * 60 * 60 * 1000;
  }

  // Submission count
  const moreThan = query.match(/more than\s+(\d+)\s+submissions?/);
  if (moreThan) parsed.minSubmissions = Number(moreThan[1]) + 0;
  const lessThan = query.match(/less than\s+(\d+)\s+submissions?/);
  if (lessThan) parsed.maxSubmissions = Number(lessThan[1]) - 0;
  if (/no submissions?/.test(query)) parsed.maxSubmissions = 0;
  if (/with submissions?/.test(query)) parsed.requireAnySubmissions = true;

  // Sort directives
  if (/most popular/.test(query)) parsed.sort = "submissions_desc";
  else if (/popular/.test(query)) parsed.sort = "submissions_desc";
  if (/latest|newest|most recent/.test(query)) parsed.sort = parsed.sort ?? "created_desc";
  if (/sorted by\s+most recent submission/.test(query)) parsed.sort = parsed.sort ?? "created_desc"; // proxy
  if (/created before/.test(query)) parsed.sort = parsed.sort ?? "created_asc";

  // IDs only question
  if (/what\s+form\s+ids?/.test(query)) parsed.returnIdsOnly = true;
  if (/what\s+form\s+slugs?/.test(query)) parsed.returnIdsOnly = true;

  return parsed;
}

const STOPWORDS = new Set([
  "form",
  "forms",
  "submission",
  "submissions",
  "with",
  "and",
  "or",
  "the",
  "a",
  "an",
  "more",
  "than",
  "less",
  "no",
  "most",
  "popular",
  "latest",
  "newest",
  "recent",
  "sorted",
  "by",
  "before",
  "after",
  "created",
  "older",
  "year",
  "years",
  "month",
  "months",
  "day",
  "days",
  "what",
  "are",
  "ids",
  "id",
  "slugs",
  "slug",
]);

function deriveSearchTerm(query: string): string | undefined {
  const quoted = query.match(/"([^"]+)"|'([^']+)'/);
  if (quoted) {
    const phrase = (quoted[1] || quoted[2] || "").trim();
    if (phrase.length >= 2) return phrase;
  }
  const tokens = (query.match(/[a-z0-9]+/g) || []).map((t) => t.toLowerCase());
  const kept = tokens.filter((t) => !STOPWORDS.has(t) && !/^\d+$/.test(t) && t.length >= 3);
  if (kept.length === 0) return undefined;
  return kept.join(" ");
}

function mergeParsed(base: ParsedQuery, input: Input): ParsedQuery {
  const out: ParsedQuery = { ...base };
  if (input.searchTerm) out.searchTerm = input.searchTerm;
  if (input.beforeDate) {
    const d = new Date(input.beforeDate);
    if (!Number.isNaN(d.valueOf())) out.createdBefore = d;
  }
  if (input.afterDate) {
    const d = new Date(input.afterDate);
    if (!Number.isNaN(d.valueOf())) out.createdAfter = d;
  }
  if (input.olderThan && typeof input.olderThan.value === "number") {
    const unit = input.olderThan.unit;
    const factor = unit === "years" ? 365 : unit === "months" ? 30 : 1;
    out.olderThanMs = input.olderThan.value * factor * 24 * 60 * 60 * 1000;
  }
  if (typeof input.minSubmissions === "number") out.minSubmissions = input.minSubmissions;
  if (typeof input.maxSubmissions === "number") out.maxSubmissions = input.maxSubmissions;
  if (typeof input.requireAnySubmissions === "boolean") out.requireAnySubmissions = input.requireAnySubmissions;
  if (typeof input.returnIdsOnly === "boolean") out.returnIdsOnly = input.returnIdsOnly;

  // Respect query intent: phrases like "most recent submissions" imply recency, not popularity.
  const q = (input.query || "").toLowerCase();
  const wantsRecentSubmissions = /recent submission|latest submission/.test(q);
  if (input.sort) {
    if (input.sort === "submissions_desc" && wantsRecentSubmissions) {
      // Keep/force created_desc if the natural language says "recent submissions"
      out.sort = out.sort ?? "created_desc";
    } else {
      out.sort = input.sort;
    }
  }
  return out;
}

function applyFilters(forms: PaperformForm[], p: ParsedQuery) {
  const now = Date.now();
  return forms.filter((f) => {
    const created = parseDate(getCreated(f));
    if (p.createdBefore && created && created > p.createdBefore) return false;
    if (p.createdAfter && created && created < p.createdAfter) return false;
    if (p.olderThanMs && created && now - created.getTime() < p.olderThanMs) return false;
    const count = typeof f.submission_count === "number" ? f.submission_count : 0;
    if (typeof p.minSubmissions === "number" && count <= p.minSubmissions) return false;
    if (typeof p.maxSubmissions === "number" && count > p.maxSubmissions) return false;
    if (p.requireAnySubmissions && count <= 0) return false;
    return true;
  });
}

function applySort(forms: PaperformForm[], p: ParsedQuery) {
  const arr = [...forms];
  arr.sort((a, b) => {
    switch (p.sort) {
      case "submissions_desc":
        return (b.submission_count || 0) - (a.submission_count || 0);
      case "submissions_asc":
        return (a.submission_count || 0) - (b.submission_count || 0);
      case "created_asc": {
        const at = getCreated(a);
        const bt = getCreated(b);
        return (at ? Date.parse(at) : 0) - (bt ? Date.parse(bt) : 0);
      }
      case "created_desc":
      default: {
        const at = getCreated(a);
        const bt = getCreated(b);
        return (bt ? Date.parse(bt) : 0) - (at ? Date.parse(at) : 0);
      }
    }
  });
  return arr;
}

function getCreated(f: PaperformForm) {
  return f.created_at_utc || f.created_at;
}

function parseDate(s?: string) {
  if (!s) return undefined;
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : new Date(t);
}

function simplify(f: PaperformForm) {
  return {
    slug: f.custom_slug || f.slug || undefined,
    title: f.name || f.title || f.slug,
    url: f.slug ? `https://paperform.co/edit/${f.slug}` : f.url || undefined,
    created_at: getCreated(f) || null,
    updated_at: f.updated_at_utc || f.updated_at || null,
    submission_count: typeof f.submission_count === "number" ? f.submission_count : 0,
  };
}

function buildSummary(p: ParsedQuery, shown: number, filteredTotal: number, scannedTotal?: number) {
  const parts: string[] = [];
  if (p.searchTerm) parts.push(`search="${p.searchTerm}"`);
  if (p.createdBefore) parts.push(`before=${p.createdBefore.toISOString().slice(0, 10)}`);
  if (p.createdAfter) parts.push(`after=${p.createdAfter.toISOString().slice(0, 10)}`);
  if (p.olderThanMs) parts.push(`olderThan=${Math.round(p.olderThanMs / (24 * 60 * 60 * 1000))}d`);
  if (typeof p.minSubmissions === "number") parts.push(`minSubmissions=${p.minSubmissions}`);
  if (typeof p.maxSubmissions === "number") parts.push(`maxSubmissions=${p.maxSubmissions}`);
  if (p.requireAnySubmissions) parts.push("hasSubmissions");
  if (p.sort) parts.push(`sort=${p.sort}`);
  const core = `${shown} of ${filteredTotal} forms`;
  const scanned = typeof scannedTotal === "number" ? ` (scanned ${scannedTotal})` : "";
  const tail = parts.length ? ` • ${parts.join(" ")}` : "";
  return `${core}${scanned}${tail}`.trim();
}

// end of tool helpers
