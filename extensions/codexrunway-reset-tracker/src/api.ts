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
  });
}

/** Short, human label for a record's current status, e.g. for the menu bar title. */
export function statusLabel(record: ResetRecord): string {
  const type = record.resetType ?? "reset";
  if (
    record.kind === "reset_completed" ||
    record.scheduleState === "fulfilled"
  ) {
    return `${type} done`;
  }
  if (record.kind === "reset_scheduled") {
    return `${type} pending`;
  }
  return type;
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
  if (happenedToday(record.completedAt)) return record.completedAt ?? null;
  if (done && happenedToday(record.effectiveAt))
    return record.effectiveAt ?? null;
  return null;
}
