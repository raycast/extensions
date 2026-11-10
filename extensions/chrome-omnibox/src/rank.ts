// Pure ranking logic, no Raycast imports, so `node --test` can run it directly.

export type Row = {
  url: string;
  title: string;
  visit_count: number;
  typed_count: number;
  last_visit_ms: number; // unix ms (converted in SQL: Chromium µs-since-1601 overflows JS numbers)
};

export type Suggestion = {
  kind: "history" | "url" | "search";
  url: string;
  title: string;
  subtitle?: string;
};

// Inline-autocomplete territory: the query is the start of the address.
const PREFIX = 100;
// Start of any host label or title word: "gm" -> "Gmail".
const WORD = 40;
// Anywhere in url/title, or a multi-word query.
const CONTAINS = 10;
// History beats the search item only from this match level up.
const STRONG = WORD;

const DAY_MS = 86_400_000;

const bare = (url: string) => url.toLowerCase().replace(/^[a-z]+:\/\/(www\.)?/, "");

function popularity(visits: number, typed: number, lastMs: number, now: number): number {
  const days = Math.max(0, (now - lastMs) / DAY_MS);
  // Typed visits count double, like Chromium's omnibox; a month-old site weighs half.
  return (Math.log2(1 + visits) + 2 * Math.log2(1 + typed)) / (1 + days / 30);
}

function matchLevel(q: string, url: string, title: string): number {
  const terms = q.split(/\s+/);
  const b = bare(url);
  const t = title.toLowerCase();
  if (terms.length > 1) return terms.every((x) => b.includes(x) || t.includes(x)) ? CONTAINS : 0;
  if (b.startsWith(q)) return PREFIX;
  const host = b.split(/[/:?#]/)[0];
  const words = [...host.split("."), ...t.split(/[^\p{L}\p{N}]+/u)];
  if (words.some((w) => w.startsWith(q))) return WORD;
  return b.includes(q) || t.includes(q) ? CONTAINS : 0;
}

/** Address the user probably typed directly, or null if it reads like a search query. */
export function asUrl(q: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(q)) return q;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/\S*)?$/i.test(q)) return `http://${q}`;
  if (/^[^\s/.]+(\.[^\s/.]+)*\.\p{L}{2,}(:\d+)?(\/\S*)?$/u.test(q)) return `https://${q}`;
  return null;
}

type Scored = Suggestion & { match: number; score: number };

/**
 * Collapse each host into its root page ("t3.chat/") so a prefix query lands on the site,
 * not on whatever deep page happens to be visited most. Root inherits the host's total visits.
 */
function withRoots(rows: Row[]): Row[] {
  const roots = new Map<string, Row>();
  for (const r of rows) {
    let u: URL;
    try {
      u = new URL(r.url);
    } catch {
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    const key = u.hostname.replace(/^www\./, "");
    const isRoot = u.pathname === "/" && !u.search && !u.hash;
    const prev = roots.get(key);
    const root: Row = prev ?? {
      url: `${u.protocol}//${u.host}/`,
      title: "",
      visit_count: 0,
      typed_count: 0,
      last_visit_ms: 0,
    };
    root.visit_count += r.visit_count;
    root.typed_count += r.typed_count;
    root.last_visit_ms = Math.max(root.last_visit_ms, r.last_visit_ms);
    if (isRoot) {
      root.url = r.url;
      root.title = r.title;
    }
    roots.set(key, root);
  }
  const rootUrls = new Set([...roots.values()].map((r) => r.url));
  return [...roots.values(), ...rows.filter((r) => !rootUrls.has(r.url))];
}

export function rank(query: string, rows: Row[], now = Date.now()): Scored[] {
  const q = query.trim().toLowerCase();
  const out: Scored[] = [];
  for (const r of withRoots(rows)) {
    const match = q ? matchLevel(q, r.url, r.title) : CONTAINS;
    if (!match) continue;
    const pop = popularity(r.visit_count, r.typed_count, r.last_visit_ms, now);
    out.push({
      kind: "history",
      url: r.url,
      title: r.title || bare(r.url),
      subtitle: bare(r.url),
      match,
      score: match + 10 * pop,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Final list: best guess first, so a single Enter does the right thing. */
export function suggest(query: string, rows: Row[], searchUrl: string, now = Date.now(), limit = 30): Suggestion[] {
  const q = query.trim();
  const ranked = rank(q, rows, now).slice(0, limit);
  const history: Suggestion[] = ranked.map(({ kind, url, title, subtitle }) => ({ kind, url, title, subtitle }));
  if (!q) return history;

  const top = ranked[0];
  const direct = asUrl(q);
  const search: Suggestion = {
    kind: "search",
    url: searchUrl.replace("%s", encodeURIComponent(q)),
    title: q,
    subtitle: "Search",
  };
  const extra: Suggestion[] = [
    ...(direct && !history.some((h) => bare(h.url).replace(/\/$/, "") === bare(direct).replace(/\/$/, ""))
      ? [{ kind: "url" as const, url: direct, title: direct, subtitle: "Open address" }]
      : []),
    search,
  ];
  return top && top.match >= STRONG ? [history[0], ...extra, ...history.slice(1)] : [...extra, ...history];
}
