import { useFetch } from "@raycast/utils";

export const FEED_URL = "https://theusefulmedia.com/apps/data/raycast.json";
export const SITE_URL = "https://theusefulmedia.com/apps/?utm_source=raycast";

export type Alt = { s: string; w: string };
export type Versus = { o: string; u: string };

export type App = {
  s: string;
  n: string;
  t: string;
  v: string;
  f: string;
  k: string;
  p: string;
  pl: string;
  d: string[];
  c: string;
  i: string;
  sc: number;
  r: [number, number] | null;
  u: string;
  get: { l: string; u: string } | null;
  web: string | null;
  alt: Alt[];
  vs: Versus[];
  fe: boolean;
  up: string | null;
  /** Job words from the site search (e.g. "clipboard manager"). Added in feed v1 on 23 Nov 2026, so older feeds may not have it. */
  kw?: string;
};

export type Deal = {
  s: string;
  l: string;
  off: number | null;
  code: string | null;
  from: string | null;
  to: string | null;
  u: string | null;
  top: boolean;
};

export type Guide = { s: string; n: string; a: string; u: string; picks: string[]; w: string | null };

export type Feed = {
  v: number;
  updated: string;
  site: string;
  deals: string;
  dealsSeason: string | null;
  cats: { s: string; n: string }[];
  apps: App[];
  deal: Deal[];
  guides: Guide[];
};

export function useCatalog() {
  const { data, isLoading, error, revalidate } = useFetch<Feed>(FEED_URL, {
    keepPreviousData: true,
    failureToastOptions: { title: "Couldn't load The Useful Apps" },
  });
  const bySlug = new Map<string, App>((data?.apps ?? []).map((a) => [a.s, a]));
  return { data, bySlug, isLoading, error, revalidate };
}

/** Today as YYYY-MM-DD in the user's own time zone. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A deal counts only between its start and end dates. */
export function isLive(d: Deal, now = today()) {
  return (!d.from || d.from <= now) && (!d.to || d.to >= now);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Lowercase, drop punctuation and common suffixes so "Bartender 5.app" matches "Bartender". */
export function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/\.app$/, "")
    .replace(/\s*\d+(\.\d+)*$/, "")
    .replace(/\s+(for mac|for macos|pro|lite)$/, "")
    .replace(/\s*\d+$/, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Search words for an app: tagline, category, job words and verdict, so a search by job ("clipboard") finds it. */
export function searchKeywords(a: App, catName?: string) {
  const text = [a.t, catName ?? "", a.kw ?? "", a.v ?? "", ...a.d].join(" ").toLowerCase();
  return [...new Set(text.split(/[^a-z0-9+]+/).filter((w) => w.length > 2))];
}
