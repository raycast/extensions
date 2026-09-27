import { randomUUID } from "node:crypto";
import { getAccessToken, NotAuthorizedError, SignedOutError } from "./oauth";
import type { CalendarsResponse, ScheduleResponse } from "./schedule-model";
import { batchFailure, BatchReceipt, BatchResultRow, toClientCode } from "./envelope";
import { addDaysISO, addMinutesLocal, clockPart, datePart, localMinutesBetween } from "./format";
import { API_BASE, ErrorCode, PATHS } from "./wire";

export type { BatchReceipt, BatchResultRow } from "./envelope";

// Typed client over /api/v1. It normalizes both refusal shapes to one result,
// refreshes once on 401, retries a safe call once on a 503, and never retries a 429.
// Only the `permission` code drives the Pro-required state — branch on `code`.

export type ClientCode = ErrorCode | "network" | "unauthenticated" | "signed_out";

export interface ApiError {
  ok: false;
  code: ClientCode;
  message: string;
  status?: number;
}

export type ApiResult<T> = { ok: true; data: T } | ApiError;

// `future` covers an occurrence (`seriesId@DATE`) and every later one. A bare
// occurrence id is that block only; a bare series id is the whole series.
export type Scope = "future";
export type ReflectStatus = "kept" | "skipped" | "changed" | "added";

/**
 * The editable event fields. Input shape = output shape, so a read field copies
 * over. `start` / `end` are local datetimes ("YYYY-MM-DDTHH:MM").
 */
interface EventFields {
  name?: string;
  start?: string;
  end?: string;
  notes?: string;
  areaId?: string | null; // null clears it
  activityTypeId?: string | null; // null clears it
  kind?: string;
  // Home calendar (`null` = Reassign only; omitted = the default) and one-way copies (Pro).
  calendarId?: string | null;
  mirrorCalendarIds?: string[];
}

export type CreateOp = { op: "create"; start: string; end: string; name: string } & EventFields;
// `start` / `end` move the block, also to another day; a lone `start` keeps the duration.
export type UpdateOp = { op: "update"; id: string; scope?: Scope } & EventFields;

export type WriteOp =
  | CreateOp
  | UpdateOp
  | { op: "shift"; id: string; byMinutes: number; scope?: Scope }
  | { op: "reflect"; id: string; status: ReflectStatus; actualStart?: string; actualEnd?: string }
  | { op: "delete"; id: string; scope?: Scope };

export interface BacklogOp {
  op: "capture";
  name: string;
  notes?: string;
  durationMinutes?: number;
  areaId?: string;
  activityTypeId?: string;
  plannedDate?: string;
  kind?: string; // omitted = "blocking"
}

// The POST /backlog op union. `capture` is `BacklogOp`.
// `schedule` places a parked item into the day; `remove` deletes it (undoable).
export type BacklogManageOp =
  | BacklogOp
  | {
      op: "update";
      id: string;
      name?: string;
      durationMinutes?: number;
      plannedDate?: string;
      notes?: string;
    }
  | { op: "schedule"; id: string; start: string }
  | { op: "park"; id: string }
  | { op: "remove"; id: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Core request with token, 401-refresh-once, 503-retry-once, 429-no-retry. */
async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<ApiResult<T>> {
  let token: string;
  try {
    token = await getAccessToken();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return {
        ok: false,
        code: error instanceof SignedOutError ? "signed_out" : "unauthenticated",
        message: error.message,
      };
    }
    return { ok: false, code: "network", message: asMessage(error) };
  }

  let refreshedOnce = false;
  let retriedInternal = false;

  for (;;) {
    let response: Response;
    try {
      response = await fetch(API_BASE + path, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      return { ok: false, code: "network", message: asMessage(error) };
    }

    // 401 → refresh the token once, then retry once.
    if (response.status === 401 && !refreshedOnce) {
      refreshedOnce = true;
      try {
        token = await getAccessToken({ force: true });
        continue;
      } catch (error) {
        if (error instanceof NotAuthorizedError) {
          return {
            ok: false,
            code: error instanceof SignedOutError ? "signed_out" : "unauthenticated",
            message: error.message,
          };
        }
        return { ok: false, code: "network", message: asMessage(error) };
      }
    }

    if (response.ok) {
      const data = (await parseBody(response)) as T;
      return { ok: true, data };
    }

    const failure = await normalizeError(response);

    // 503 internal → back off briefly and retry once, but only a safe call: a
    // 503 can come after a write landed, so a plain write must not run twice.
    if (response.status === 503 && failure.code === "internal" && !retriedInternal && safeToRetry(method, body)) {
      retriedInternal = true;
      await sleep(300);
      continue;
    }

    return failure;
  }
}

/**
 * Read the `{ error: { code, message } }` envelope. A rejected atomic batch also
 * carries `results`; its first failed row names the op, so prefer that row.
 */
async function normalizeError(response: Response): Promise<ApiError> {
  const status = response.status;
  const payload = (await parseBody(response)) as
    { error?: { code?: string; message?: string }; results?: BatchResultRow[] } | undefined;
  const row = Array.isArray(payload?.results) ? batchFailure({ results: payload.results }) : undefined;
  const error = row?.error ?? payload?.error;
  const message = error?.message ?? `Request failed (${status}).`;
  return { ok: false, code: toClientCode(error?.code, status), message, status };
}

/** A read, or a write that the server deduplicates by its `requestId` / `submissionId`. */
function safeToRetry(method: "GET" | "POST", body: unknown): boolean {
  if (method === "GET") return true;
  const b = body as { submissionId?: unknown; requests?: { requestId?: unknown }[] } | undefined;
  if (typeof b?.submissionId === "string") return true;
  return (
    Array.isArray(b?.requests) && b.requests.length > 0 && b.requests.every((r) => typeof r.requestId === "string")
  );
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text } };
  }
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// --- Typed endpoints ---------------------------------------------------------

interface ScheduleParams {
  from: string;
  to: string;
  includeBacklog?: boolean;
  backlogOffset?: number;
  includeSeries?: boolean;
}

/** Build the /schedule query string. `from` and `to` are required; backlog needs the flag. */
function scheduleQuery(params: ScheduleParams): string {
  const q = new URLSearchParams({ from: params.from, to: params.to });
  if (params.includeBacklog) q.set("includeBacklog", "true");
  if (params.backlogOffset !== undefined) q.set("backlogOffset", String(params.backlogOffset));
  if (params.includeSeries) q.set("includeSeries", "true");
  return `?${q.toString()}`;
}

/** Read one day (`from` = `to`). */
export function getSchedule(date: string): Promise<ApiResult<ScheduleResponse>> {
  return getScheduleRange(date, date);
}

/** Read a contiguous [from, to] date range in one call. Response groups days[]. */
export function getScheduleRange(from: string, to: string): Promise<ApiResult<ScheduleResponse>> {
  return request<ScheduleResponse>("GET", PATHS.schedule + scheduleQuery({ from, to }));
}

/** Read a day plus the parked-block inbox. The backlog needs includeBacklog=true. */
export async function getScheduleWithBacklog(date: string): Promise<ApiResult<ScheduleResponse>> {
  const first = await request<ScheduleResponse>(
    "GET",
    PATHS.schedule + scheduleQuery({ from: date, to: date, includeBacklog: true }),
  );
  if (!first.ok) return first;
  const backlog = [...(first.data.backlog ?? [])];
  let offset = first.data.nextBacklogOffset;
  let previous = 0;
  while (offset != null) {
    if (!Number.isSafeInteger(offset) || offset <= previous) {
      return { ok: false, code: "internal", message: "Could not load the complete Inbox. Try again." };
    }
    const page = await request<ScheduleResponse>(
      "GET",
      PATHS.schedule + scheduleQuery({ from: date, to: date, includeBacklog: true, backlogOffset: offset }),
    );
    if (!page.ok) return page;
    backlog.push(...(page.data.backlog ?? []));
    previous = offset;
    offset = page.data.nextBacklogOffset;
  }
  return {
    ok: true,
    data: {
      ...first.data,
      backlog: [...new Map(backlog.map((item) => [item.id, item])).values()],
      nextBacklogOffset: null,
    },
  };
}

/**
 * Move a time change of one occurrence onto its series anchor. A bare series id
 * reads `start` / `end` on the anchor day, so an occurrence datetime would
 * re-anchor the series. A new start keeps its clock and moves the anchor by the
 * days from the occurrence's original date; a new end keeps the anchor start and
 * sets the new length. So a changed occurrence gives the series the chosen times.
 */
export async function rebaseOnSeries(
  seriesId: string,
  occurrence: { date: string; start: string; end: string },
  change: { start?: string; end?: string },
): Promise<ApiResult<{ start?: string; end?: string }>> {
  // The original date of the occurrence (from its id), also when it was moved.
  const day = occurrence.date;
  const read = await request<ScheduleResponse>(
    "GET",
    PATHS.schedule + scheduleQuery({ from: day, to: day, includeSeries: true }),
  );
  if (!read.ok) return read;
  const anchor = read.data.series?.find((s) => s.id === seriesId);
  if (!anchor) return { ok: false, code: "not_found", message: "The series was not found. Edit it in Reassign." };
  const out: { start?: string; end?: string } = {};
  if (change.start) {
    const days = Math.round((localMinutesBetween(`${day}T00:00`, `${datePart(change.start)}T00:00`) ?? 0) / 1440);
    out.start = `${addDaysISO(datePart(anchor.start), days)}T${clockPart(change.start)}`;
  }
  if (change.end) out.end = addMinutesLocal(anchor.start, localMinutesBetween(occurrence.start, change.end) ?? 0);
  return { ok: true, data: out };
}

/** The connected calendars, in picker order, plus the account default. */
export function listCalendars(): Promise<ApiResult<CalendarsResponse>> {
  return request<CalendarsResponse>("GET", PATHS.calendars);
}

/** The one event write endpoint: create, update, shift, reflect, and delete ops. */
export function writeEvents(ops: WriteOp[]): Promise<ApiResult<BatchReceipt>> {
  return request<BatchReceipt>("POST", PATHS.events, { ops });
}

/** One /schedule/plan request. The bounds are local datetimes; `start` excludes the window. */
export interface PlanRequest {
  name: string;
  durationMinutes: number;
  start?: string;
  earliest?: string;
  latest?: string;
  areaId?: string;
  activityTypeId?: string;
  kind?: string;
  notes?: string;
  autoCommitBest?: boolean;
  requestId?: string;
}

export function planSchedule(requests: PlanRequest[]): Promise<ApiResult<Record<string, unknown>>> {
  return request<Record<string, unknown>>("POST", PATHS.schedulePlan, { requests });
}

export function confirmSchedule(
  items: { token: string; choice?: number }[],
): Promise<ApiResult<Record<string, unknown>>> {
  return request<Record<string, unknown>>("POST", PATHS.scheduleConfirm, { items });
}

export function undo(tokens: string[]): Promise<ApiResult<Record<string, unknown>>> {
  return request<Record<string, unknown>>("POST", PATHS.actionsUndo, { tokens });
}

export function backlogCapture(op: BacklogOp): Promise<ApiResult<BatchReceipt>> {
  return request<BatchReceipt>("POST", PATHS.backlog, { ops: [op] });
}

/** Apply backlog ops (capture/update/schedule/park/remove). Returns an undoToken. */
export function manageBacklog(ops: BacklogManageOp[]): Promise<ApiResult<BatchReceipt>> {
  return request<BatchReceipt>("POST", PATHS.backlog, { ops });
}

// GET /events/search row: a full event; the view reads only these fields.
export interface SearchEvent {
  id: string;
  start: string; // local datetime
  end: string; // local datetime
  name: string;
}

export interface SearchResponse {
  ambiguous?: boolean;
  timezone?: string;
  events: SearchEvent[];
}

/** Find events by text across the schedule (an optional [from, to] window). */
export function searchEvents(
  query: string,
  opts?: { from?: string; to?: string; areaId?: string; activityTypeId?: string },
): Promise<ApiResult<SearchResponse>> {
  const q = new URLSearchParams({ query });
  if (opts?.from) q.set("from", opts.from);
  if (opts?.to) q.set("to", opts.to);
  if (opts?.areaId) q.set("areaId", opts.areaId);
  if (opts?.activityTypeId) q.set("activityTypeId", opts.activityTypeId);
  return request<SearchResponse>("GET", `${PATHS.eventsSearch}?${q.toString()}`);
}

export type FeedbackKind = "bug" | "idea" | "other";

/**
 * Send feedback. The server answers 204 with no body. The `submissionId` stays
 * the same on the 503 retry, so the server keeps one copy.
 */
export function sendFeedback(message: string, kind: FeedbackKind = "other"): Promise<ApiResult<void>> {
  return request<void>("POST", PATHS.feedback, { kind, message, submissionId: randomUUID() });
}

/** Ask Reassign AI for a preview only. Saving uses the normal reviewed form. */
export function previewBlock(input: string): Promise<ApiResult<import("./ai-draft").AiPreview>> {
  return request("POST", "/command", { input, mode: "line", apply: false });
}
