import { buildLeagueDetailUrl, buildTeamDetailUrl } from "@/utils/url-builder";

const FOTMOB_BASE_URL = "https://www.fotmob.com";

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getRecord(record: JsonRecord, key: string) {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

export function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function getNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export function getBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function getRequestHeaders(): Record<string, string> {
  return {
    Accept: "application/json, text/html;q=0.9, */*;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  };
}

function getTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function toFotmobUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${FOTMOB_BASE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function formatFotmobDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildFotmobApiUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(toFotmobUrl(path));

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, `${value}`);
    }
  });

  return url.toString();
}

export async function fetchFotmobJson<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const response = await fetch(buildFotmobApiUrl(path, params), { headers: getRequestHeaders() });

  if (!response.ok) {
    throw new Error(`FotMob request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchMatchDayJson<T>(date: Date) {
  return fetchFotmobJson<T>("/api/data/matches", {
    date: formatFotmobDate(date),
    timezone: getTimezone(),
  });
}

// FotMob no longer exposes a usable public JSON API for these pages, so data is
// read from the Next.js `__NEXT_DATA__` payload embedded in the page HTML.
export async function fetchFotmobPageProps(pathOrUrl: string) {
  const response = await fetch(toFotmobUrl(pathOrUrl), { headers: getRequestHeaders() });

  if (!response.ok) {
    throw new Error(`FotMob page request failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);

  if (!match?.[1]) {
    throw new Error("FotMob page data was not found");
  }

  const nextData = JSON.parse(match[1]) as unknown;

  if (!isRecord(nextData)) {
    throw new Error("FotMob page data is invalid");
  }

  const props = nextData.props;
  if (!isRecord(props) || !isRecord(props.pageProps)) {
    throw new Error("FotMob page props are invalid");
  }

  return props.pageProps;
}

export async function fetchTeamPageData<T>(teamId: string) {
  const pageProps = await fetchFotmobPageProps(buildTeamDetailUrl(teamId));
  const fallback = pageProps.fallback;

  if (isRecord(fallback) && isRecord(fallback[`team-${teamId}`])) {
    return fallback[`team-${teamId}`] as T;
  }

  return pageProps as T;
}

export async function fetchLeaguePageData<T>(leagueId: string) {
  return (await fetchFotmobPageProps(buildLeagueDetailUrl(leagueId))) as T;
}
