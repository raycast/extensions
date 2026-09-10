export const BASE_URL = "https://www.codexrunway.com/openapi/v1";

export type ResetKind = "all" | "reset_scheduled" | "reset_completed";

export interface ResetScope {
  plans: string[];
  windows: string[];
}

export interface ResetSource {
  origin: string;
  postId: string | null;
  handle: string | null;
  url: string | null;
}

export interface ResetScheduleWindow {
  startAt: string;
  endAt: string;
}

export interface ResetRecord {
  id: string;
  kind: "reset_scheduled" | "reset_completed";
  resetType: string;
  announcedAt: string | null;
  effectiveAt?: string | null;
  text: string | null;
  confidence: number | null;
  scope: ResetScope;
  source: ResetSource;
  schedulePrecision?: string | null;
  scheduleBasis?: string | null;
  scheduleWindow?: ResetScheduleWindow | null;
  scheduleState?: string | null;
  completedAt?: string | null;
  completionRecordId?: string | null;
  fulfillmentOrigin?: string | null;
  relatedRecordIds?: string[];
}

export interface ApiMeta {
  generatedAt: string;
  lastSuccessfulCheckAt: string;
}

/** The `/records` endpoint nests the page of results (and pagination info) under `data`. */
export interface RecordsPage {
  items: ResetRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export interface RecordsResponse {
  ok: boolean;
  data: RecordsPage;
  meta: ApiMeta;
}

export function recordsUrl(
  kind: ResetKind = "all",
  page = 1,
  pageSize = 10,
): string {
  const params = new URLSearchParams();
  if (kind !== "all") params.set("kind", kind);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return `${BASE_URL}/records?${params.toString()}`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function recordState(record: ResetRecord): string {
  if (record.kind === "reset_completed" || record.scheduleState === "fulfilled")
    return "Completed";
  return record.scheduleState ? humanize(record.scheduleState) : "Scheduled";
}

export function humanize(value: string): string {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function statusLabel(record: ResetRecord): string {
  return `${humanize(record.resetType)} reset · ${recordState(record)}`;
}

/** True if `iso` falls on today's calendar date (viewer's local timezone). */
function isToday(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Compact "4h ago" / "2d ago" style relative time, mirroring the site's "(4h)" annotations. */
export function relativeTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const diffMs = Date.now() - d.getTime();
  const abs = Math.abs(diffMs);
  const suffix = diffMs >= 0 ? "ago" : "from now";
  const minutes = Math.round(abs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ${suffix}`;
  const hours = Math.round(abs / 3600000);
  if (hours < 24) return `${hours}h ${suffix}`;
  const days = Math.round(abs / 86400000);
  return `${days}d ${suffix}`;
}

/** True if `iso` is today *and* already in the past (a reset later today hasn't happened yet). */
function happenedToday(iso?: string | null): boolean {
  return isToday(iso) && new Date(iso as string).getTime() <= Date.now();
}

/**
 * Timestamp at which this record shows a reset as having already happened today, else null.
 * Mirrors `statusLabel`/`statusIcon`: a fulfilled schedule counts as done even when the
 * completion itself lives on a separate record (`completionRecordId`).
 */
export function resetTodayAt(record: ResetRecord): string | null {
  const done =
    record.kind === "reset_completed" || record.scheduleState === "fulfilled";
  if (record.completedAt)
    return happenedToday(record.completedAt) ? record.completedAt : null;
  if (done && happenedToday(record.effectiveAt))
    return record.effectiveAt ?? null;
  return null;
}

/** Select the most recent completion, not the most recently announced schedule. */
export function resetTodayIn(records: ResetRecord[]): {
  resetToday: boolean;
  at: string | null;
  record: ResetRecord | undefined;
} {
  let at: string | null = null;
  let record: ResetRecord | undefined;
  for (const candidate of records) {
    const time = resetTodayAt(candidate);
    if (time && (!at || Date.parse(time) > Date.parse(at))) {
      at = time;
      record = candidate;
    }
  }
  return { resetToday: at !== null, at, record };
}

/** Reject unsuccessful payloads instead of rendering them as empty records. */
export async function parseRecords(
  response: Response,
): Promise<RecordsResponse> {
  if (!response.ok)
    throw new Error(`Unable to load records (HTTP ${response.status})`);
  const result = (await response.json()) as Partial<RecordsResponse> | null;
  if (!result?.ok || !Array.isArray(result.data?.items))
    throw new Error("Invalid records response");
  return result as RecordsResponse;
}

export function matchesPlan(record: ResetRecord, plan: string): boolean {
  const plans = record.scope?.plans?.map((value) => value.toLowerCase()) ?? [];
  return (
    plan === "all" ||
    plans.includes("all") ||
    plans.includes(plan.toLowerCase())
  );
}

/** Prefer the earliest upcoming window; otherwise expose an unconfirmed elapsed plan. */
export function nextScheduleIn(
  records: ResetRecord[],
  now = Date.now(),
): ResetRecord | undefined {
  const pending = records.filter(
    (record) =>
      record.kind === "reset_scheduled" &&
      !record.completedAt &&
      !record.completionRecordId &&
      !["fulfilled", "cancelled", "canceled", "superseded", "expired"].includes(
        record.scheduleState ?? "",
      ),
  );
  const start = (record: ResetRecord) =>
    Date.parse(record.scheduleWindow?.startAt ?? record.effectiveAt ?? "");
  const end = (record: ResetRecord) =>
    Date.parse(record.scheduleWindow?.endAt ?? record.effectiveAt ?? "");
  const upcoming = pending
    .filter((record) => end(record) >= now)
    .sort((a, b) => start(a) - start(b));
  return (
    upcoming[0] ??
    pending.find((record) => !Number.isFinite(end(record))) ??
    pending.sort((a, b) => end(b) - end(a))[0]
  );
}

/** Display text for a schedule's window, plus whether that window already elapsed. */
export function scheduleTime(
  record: ResetRecord,
): { start: string; time: string; overdue: boolean } | null {
  const start = record.scheduleWindow?.startAt ?? record.effectiveAt;
  const end = record.scheduleWindow?.endAt ?? record.effectiveAt;
  if (!start || !Number.isFinite(Date.parse(start))) return null;
  const time =
    end && end !== start
      ? `${formatDate(start)} – ${formatDate(end)}`
      : formatDate(start);
  return { start, time, overdue: Date.parse(end ?? start) < Date.now() };
}

/**
 * How far the wait has run, 0–1, from the announcement to the schedule's start.
 * Null when the elapsed fraction is unknowable (no target, or no announcement to measure from).
 */
export function scheduleProgress(
  record: ResetRecord,
  now = Date.now(),
): number | null {
  const target = Date.parse(
    record.scheduleWindow?.startAt ?? record.effectiveAt ?? "",
  );
  if (!Number.isFinite(target)) return null;
  if (now >= target) return 1;
  const from = Date.parse(record.announcedAt ?? "");
  if (!Number.isFinite(from) || from >= target) return null;
  return Math.max(0, (now - from) / (target - from));
}

export function scheduleLabel(record?: ResetRecord): string {
  if (!record) return "No upcoming schedule found in the latest records";
  const schedule = scheduleTime(record);
  if (!schedule) return "Timing not yet confirmed";
  return schedule.overdue
    ? `Expected ${schedule.time} — awaiting completion confirmation`
    : `Expected ${schedule.time}`;
}

/** Match every query word across the full announcement and scope, without native keyword truncation. */
export function matchesSearch(record: ResetRecord, query: string): boolean {
  const text = [
    statusLabel(record),
    record.text,
    ...(record.scope?.plans ?? []),
    ...(record.scope?.windows ?? []),
  ]
    .join(" ")
    .toLocaleLowerCase();
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}

export function recordTime(record: ResetRecord): number {
  return (
    Date.parse(
      record.completedAt ?? record.effectiveAt ?? record.announcedAt ?? "",
    ) || 0
  );
}

export function formatWindow(window: ResetScheduleWindow): string {
  return window.startAt === window.endAt
    ? formatDate(window.startAt)
    : `${formatDate(window.startAt)} – ${formatDate(window.endAt)}`;
}
