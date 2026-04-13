import { getPreferenceValues } from "@raycast/api";

export interface MetronIssue {
  id: number;
  series: { id?: number; name: string; volume: number; year_began: number };
  number: string;
  issue_name: string | null;
  cover_date: string;
  store_date: string | null;
  image: string | null;
  cover_hash: string | null;
  publisher: { id: number; name: string };
}

export interface MetronIssueDetail extends MetronIssue {
  series: { id: number; name: string; volume: number; year_began: number };
  desc: string | null;
  variants: MetronVariant[];
  credits: MetronCredit[];
  characters: Array<{ id: number; name: string }>;
  arcs: Array<{ id: number; name: string }>;
  price: string | null;
  page_count: number | null;
  sku: string | null;
  isbn: string | null;
}

export interface MetronVariant {
  name: string;
  sku: string | null;
  image: string | null;
}

export interface MetronCredit {
  id: number;
  creator: string;
  role: Array<{ id: number; name: string }>;
}

export interface MetronListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function authHeader(): string {
  const { username, password } = getPreferenceValues<Preferences>();
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

const BASE = "https://metron.cloud/api";

async function metronFetch<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "User-Agent": "MetronComics-RaycastExtension/1.0",
    },
  });
  if (response.status === 401)
    throw new Error("Invalid credentials. Check your Metron username and password in Raycast Preferences.");
  if (response.status === 429) throw new Error("Rate limit hit. Please wait a moment and try again.");
  if (!response.ok) throw new Error(`Metron API error: ${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

/**
 * Returns the most recent Wednesday on or before today.
 */
export function thisWednesday(): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun ... 6=Sat
  const daysBack = day >= 3 ? day - 3 : day + 4;
  const wed = new Date(today);
  wed.setDate(today.getDate() - daysBack);
  return wed.toISOString().split("T")[0];
}

export function endOfWeek(startDate: string): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

export function formatDate(raw: string | null | undefined): string {
  if (!raw) return "Unknown date";
  try {
    const [year, month, day] = raw.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

export async function fetchWeeklyIssues(storeDate: string, publisherName?: string): Promise<MetronIssue[]> {
  const end = endOfWeek(storeDate);
  const params = new URLSearchParams({
    store_date_range_after: storeDate,
    store_date_range_before: end,
    ...(publisherName ? { publisher_name: publisherName } : {}),
  });
  const all: MetronIssue[] = [];
  let path: string | null = `/issue/?${params.toString()}`;
  while (path) {
    const data: MetronListResponse<MetronIssue> = await metronFetch<MetronListResponse<MetronIssue>>(path);
    all.push(...data.results);
    path = data.next ? data.next.replace(BASE, "") : null;
  }
  return all;
}

export async function fetchIssueDetail(id: number): Promise<MetronIssueDetail> {
  return metronFetch<MetronIssueDetail>(`/issue/${id}/`);
}

export async function searchIssues(seriesName: string, issueNumber?: string): Promise<MetronIssue[]> {
  const params = new URLSearchParams({
    series_name: seriesName,
    ...(issueNumber ? { number: issueNumber } : {}),
  });
  const all: MetronIssue[] = [];
  let path: string | null = `/issue/?${params.toString()}`;
  while (path) {
    const data: MetronListResponse<MetronIssue> = await metronFetch<MetronListResponse<MetronIssue>>(path);
    all.push(...data.results);
    path = data.next ? data.next.replace(BASE, "") : null;
  }
  return all;
}

export function issueTitle(issue: MetronIssue): string {
  const base = `${issue.series.name} #${issue.number}`;
  return issue.issue_name ? `${base} — ${issue.issue_name}` : base;
}

export interface MetronSeries {
  id: number;
  name: string;
  volume: number;
  year_began: number;
  year_end: number | null;
  issue_count: number;
  genres: { id: number; name: string }[];
  publisher: { id: number; name: string };
  series_type: { id: number; name: string };
  desc: string | null;
  image: string | null;
}

export async function fetchSeriesDetail(id: number): Promise<MetronSeries> {
  return metronFetch<MetronSeries>(`/series/${id}/`);
}

export async function fetchSeriesIssues(seriesId: number): Promise<MetronIssue[]> {
  const params = new URLSearchParams({
    series_id: String(seriesId),
    ordering: "store_date",
  });
  let all: MetronIssue[] = [];
  let url: string | null = `/issue/?${params.toString()}`;
  while (url) {
    const data: MetronListResponse<MetronIssue> = await metronFetch<MetronListResponse<MetronIssue>>(url);
    all = all.concat(data.results);
    url = data.next ? data.next.replace(BASE, "") : null;
  }
  return all;
}
