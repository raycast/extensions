const API_BASE = "https://numberresearch.xyz/api";

export interface CheckResult {
  is_new: boolean;
  number: string;
  discovered_at: string;
  search_count: number;
}

export interface TopNumber {
  number: string;
  search_count: number;
  discovered_at: string;
}

export interface StatsData {
  total_count: number;
  top_numbers: TopNumber[];
  number_of_the_day: string;
}

export async function checkNumber(number: string, signal?: AbortSignal): Promise<CheckResult> {
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number }),
    signal,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as CheckResult;
}

export async function fetchStats(signal?: AbortSignal): Promise<StatsData> {
  const res = await fetch(`${API_BASE}/stats`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as StatsData;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US");
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}
