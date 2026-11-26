// Pure formatting helpers (no @raycast/api).

export function relativeTime(iso?: string | null, now: number = Date.now()): string {
  if (!iso) return "-";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const s = Math.round((now - t) / 1000);
  const abs = Math.abs(s);
  const suffix = s >= 0 ? "ago" : "from now";
  if (abs < 60) return `${abs}s ${suffix}`;
  if (abs < 3600) return `${Math.round(abs / 60)}m ${suffix}`;
  if (abs < 86400) return `${Math.round(abs / 3600)}h ${suffix}`;
  return `${Math.round(abs / 86400)}d ${suffix}`;
}

export function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "-";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** Duration between two ISO timestamps (end defaults to now for running things). */
export function durationBetween(start?: string | null, end?: string | null, now: number = Date.now()): number | null {
  if (!start) return null;
  const a = Date.parse(start);
  const b = end ? Date.parse(end) : now;
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, (b - a) / 1000);
}

export function formatTimestamp(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "Z")
    .replace(/:\d\dZ$/, "Z");
}

/** ISO timestamp `hours` ago, for start_date_gte filters. */
export function hoursAgoIso(hours: number, now: number = Date.now()): string {
  return new Date(now - hours * 3600 * 1000).toISOString();
}

/** Fence text for Markdown so backticks inside logs cannot break out of the block. */
export function codeBlock(text: string, lang = ""): string {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((s) => s.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${lang}\n${text}\n${fence}`;
}
