import type { Entry, Project, Resources, Tag, Workspace } from "./types";

export function serverOrigin(value: string): string {
  const url = new URL(value.trim() || "https://app.ttrackii.com");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "Use an HTTPS server origin, or HTTP localhost for development.",
    );
  }
  return url.origin;
}
/** Compact total, e.g. `45m` or `3h 5m`. */
export function duration(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}
/** Running-clock format, e.g. `0:04:09` or `12:30:00`. */
export function clock(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${Math.floor(seconds / 3600)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}
/** Elapsed time of a timer snapshot, advanced locally since the server measured it. */
export function elapsed(
  timer: { running: boolean; elapsedMs: number; asOf: string },
  now = Date.now(),
): number {
  if (!timer.running) return 0;
  const asOf = Date.parse(timer.asOf);
  return (
    timer.elapsedMs + (Number.isFinite(asOf) ? Math.max(0, now - asOf) : 0)
  );
}
export function timeRange(start: number, end: number | null): string {
  const format = (value: number) =>
    new Date(value).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  return `${format(start)} – ${end === null ? "now" : format(end)}`;
}
/** Device codes are entered in two groups of four, matching the browser approval page. */
export function formatUserCode(code: string): string {
  const clean = code.replace(/[-\s]/g, "").toUpperCase();
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
export function reportDate(now = new Date()): string {
  // Match the existing CLI/API date contract, which assigns timer dates in UTC.
  return now.toISOString().slice(0, 10);
}
/** Whether `tag` can join a selection with this project and tags (mirrors the server). */
export function compatible(
  project: Project | undefined,
  tag: Tag,
  selected: Tag[] = [],
): boolean {
  const projectId =
    project?.id ?? selected.find((other) => other.projectId)?.projectId;
  if (tag.projectId && projectId && tag.projectId !== projectId) return false;
  const clients = [
    project?.clientId,
    ...selected.map((other) => other.clientId),
  ];
  return !tag.clientId || clients.every((id) => !id || id === tag.clientId);
}
export function timerSelection(
  workspace: Workspace,
  resources: Resources,
  projectId: string,
  tagIds: string[],
) {
  if (!workspace.writable)
    throw new Error(
      "This workspace is read-only. Open ttrackii to manage access.",
    );
  const project = resources.projects.find((p) => p.id === projectId);
  if (projectId && !project) throw new Error("Choose an available project.");
  const chosen = tagIds.map((id) => {
    const tag = resources.tags.find((t) => t.id === id);
    if (!tag) throw new Error("Choose available tags.");
    return tag;
  });
  chosen.forEach((tag, index) => {
    if (!compatible(project, tag, chosen.slice(0, index)))
      throw new Error(
        `“${tag.name}” belongs to a different project or client.`,
      );
  });
  const inferredId = project?.id ?? chosen.find((t) => t.projectId)?.projectId;
  const effectiveProject = inferredId
    ? resources.projects.find((p) => p.id === inferredId)
    : undefined;
  if (inferredId && !effectiveProject)
    throw new Error("The tag's project is unavailable.");
  if (workspace.kind === "team" && !effectiveProject)
    throw new Error("Team timers require a project.");
  return {
    workspaceId: workspace.id,
    projectId: effectiveProject?.id ?? null,
    tagIds: chosen.map((t) => t.id),
  };
}
type Rated = {
  billingRateMinor?: number | null;
  billingCurrency?: string | null;
};
/** The rate "Default" billing resolves to: first tag with a rate, then the project. */
export function defaultRate(project: Rated | undefined, tags: Rated[]) {
  const source = [...tags, project].find(
    (item) => item?.billingRateMinor != null && item.billingCurrency,
  );
  return source
    ? {
        billingRateMinor: source.billingRateMinor!,
        billingCurrency: source.billingCurrency!,
      }
    : undefined;
}
function fractionDigits(currency: string) {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}
export function formatMoney(amountMinor: number, currency: string) {
  const code = currency.toUpperCase();
  const digits = fractionDigits(code);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: digits,
    }).format(amountMinor / 10 ** digits);
  } catch {
    return `${code} ${(amountMinor / 10 ** digits).toFixed(digits)}`;
  }
}
export const formatRate = (rateMinor: number, currency: string) =>
  `${formatMoney(rateMinor, currency)}/h`;
/** "85", "85.5" or "1,234.50" → minor units; undefined when it isn't a valid amount. */
export function parseRate(input: string, currency: string): number | undefined {
  const clean = input.trim().replace(/[\s,]/g, "");
  const digits = fractionDigits(currency.toUpperCase());
  if (!/^\d+(\.\d+)?$/.test(clean)) return undefined;
  const [whole, fraction = ""] = clean.split(".");
  if (fraction.length > digits) return undefined;
  const minor =
    Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0") || 0);
  return Number.isSafeInteger(minor) ? minor : undefined;
}
/** Minor units → the plain number `parseRate` reads back, e.g. 8550 EUR → "85.50". */
export function rateInput(amountMinor: number, currency: string) {
  const digits = fractionDigits(currency.toUpperCase());
  return (amountMinor / 10 ** digits).toFixed(digits);
}
export const isCurrency = (value: string) => /^[A-Za-z]{3}$/.test(value.trim());

export type Timeframe =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "last-30-days"
  | "this-year";
export const TIMEFRAMES: { id: Timeframe; title: string }[] = [
  { id: "today", title: "Today" },
  { id: "yesterday", title: "Yesterday" },
  { id: "this-week", title: "This Week" },
  { id: "last-week", title: "Last Week" },
  { id: "this-month", title: "This Month" },
  { id: "last-month", title: "Last Month" },
  { id: "last-30-days", title: "Last 30 Days" },
  { id: "this-year", title: "This Year" },
];
const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/**
 * Inclusive UTC date range (the API's date contract) plus the immediately
 * preceding period of equal length, for comparisons.
 */
export function timeframeRange(id: Timeframe, now = new Date()) {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const monday = today - ((now.getUTCDay() + 6) % 7) * DAY;
  const firstOfMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const [from, to] = {
    today: [today, today],
    yesterday: [today - DAY, today - DAY],
    "this-week": [monday, today],
    "last-week": [monday - 7 * DAY, monday - DAY],
    "this-month": [firstOfMonth, today],
    "last-month": [
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      firstOfMonth - DAY,
    ],
    "last-30-days": [today - 29 * DAY, today],
    "this-year": [Date.UTC(now.getUTCFullYear(), 0, 1), today],
  }[id];
  const days = Math.round((to - from) / DAY) + 1;
  return {
    from: isoDay(from),
    to: isoDay(to),
    previousFrom: isoDay(from - days * DAY),
    previousTo: isoDay(from - DAY),
    days,
  };
}
/** Change against the previous period; undefined when there is nothing to compare. */
export function percentChange(current: number, previous: number) {
  return previous > 0
    ? Math.round(((current - previous) / previous) * 100)
    : undefined;
}
export function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
/** Local-day section title for an entry's start time. */
export function dayLabel(startTime: number, now = new Date()) {
  const start = new Date(startTime);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
      ).getTime()) /
      DAY,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return start.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(start.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}
export function bar(value: number, max: number, width = 12) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return "▇".repeat(Math.max(value > 0 ? 1 : 0, filled));
}
export function selectedWorkspace(
  workspaces: Workspace[],
  saved?: string,
): string {
  return (
    workspaces.find((w) => w.id === saved)?.id ??
    workspaces.find((w) => w.id === "personal")?.id ??
    workspaces[0]?.id ??
    "personal"
  );
}
export function verificationUrl(
  code: { verification_uri: string; verification_uri_complete?: string },
  origin: string,
): string {
  const url = new URL(
    code.verification_uri_complete || code.verification_uri,
    origin,
  );
  if (url.origin !== origin || url.pathname !== "/device")
    throw new Error("The server returned an unexpected approval URL.");
  return url.href;
}

/**
 * Task autocomplete, ranked like the web timer: completed entries only, task
 * prefix matches before other task matches, then project/tag matches, newest
 * first within each group, one suggestion per task name. `entries` must be
 * newest first.
 */
export function suggestTasks(entries: Entry[], query: string, limit: number) {
  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();
  const groups: [Entry[], Entry[], Entry[]] = [[], [], []];
  for (const entry of entries) {
    const key = entry.taskName.trim().toLowerCase();
    if (entry.isRunning || !key || seen.has(key)) continue;
    const rank =
      !needle || key.startsWith(needle)
        ? 0
        : key.includes(needle)
          ? 1
          : [entry.projectName, ...(entry.tagNames ?? [])].some((value) =>
                value?.toLowerCase().includes(needle),
              )
            ? 2
            : -1;
    if (rank === -1) continue;
    seen.add(key);
    groups[rank as 0 | 1 | 2].push(entry);
  }
  return groups.flat().slice(0, limit);
}
