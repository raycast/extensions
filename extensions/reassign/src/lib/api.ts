import { getAccessToken, NotAuthorizedError } from "./oauth";
import type { CalendarsResponse, ScheduleResponse } from "./schedule-model";
import { API_BASE, ErrorCode, PATHS } from "./wire";

// Typed client over /api/v1. It normalizes both refusal shapes to one result,
// refreshes once on 401, retries once on a 503, and never retries a 429.
// Only the `permission` code drives the Pro-required state — branch on `code`.

export type ClientCode = ErrorCode | "network" | "unauthenticated";

export interface ApiError {
  ok: false;
  code: ClientCode;
  message: string;
  status?: number;
}

export type ApiResult<T> = { ok: true; data: T } | ApiError;

export type Scope = "this" | "future" | "all";
export type ReflectStatus = "kept" | "skipped" | "changed" | "added";

export type WriteOp =
  | {
      op: "create";
      date: string;
      start: string;
      end: string;
      endNextDay?: boolean;
      name: string;
      notes?: string;
      areaId?: string;
      activityTypeId?: string;
      areaName?: string;
      activityTypeName?: string;
      kind?: string;
      // Calendar publish targets (Pro). `syncTo: null` forces a dial-only block.
      syncTo?: string | null;
      mirrorTo?: string[];
    }
  | {
      op: "move";
      id: string;
      start?: string;
      date?: string;
      scope?: Scope;
      occurrenceDate?: string;
    }
  | { op: "shift"; id: string; byMinutes: number; scope?: Scope; occurrenceDate?: string }
  | {
      op: "reflect";
      id: string;
      status: ReflectStatus;
      actualStart?: string;
      actualEnd?: string;
      actualEndNextDay?: boolean;
    }
  | { op: "delete"; id: string; scope?: Scope; occurrenceDate?: string };

// The PATCH /events/{id} body. Every field is optional; send only what changes.
// The server supports name/time/date/area/activity/notes edits (verified 2026-08-15).
export interface UpdateEventPatch {
  name?: string;
  start?: string;
  end?: string;
  endNextDay?: boolean;
  date?: string;
  areaId?: string;
  areaName?: string;
  activityTypeId?: string;
  activityTypeName?: string;
  notes?: string;
  kind?: string;
  // Re-home (`id`) or unlink (`null`) the calendar copy, and replace the mirror
  // set. Both apply to the whole series, so they need `scope: "all"` on a repeat.
  syncTo?: string | null;
  mirrorTo?: string[];
  scope?: Scope;
  occurrenceDate?: string;
}

export interface BatchResultRow {
  index: number;
  status: "ok" | "error";
  result?: unknown;
  error?: string;
  errorCode?: string;
}

export interface BatchReceipt {
  applied: number;
  failed: number;
  skipped?: number;
  results: BatchResultRow[];
  undoToken?: string;
}

export interface BacklogOp {
  op: "capture";
  name: string;
  notes?: string;
  durationHours?: number;
  areaId?: string;
  areaName?: string;
  activityTypeId?: string;
  activityTypeName?: string;
  plannedDate?: string;
}

// The POST /backlog op union (verified 2026-08-15). `capture` is `BacklogOp`.
// `schedule` places a parked item into the day; `remove` deletes it (undoable).
export type BacklogManageOp =
  | BacklogOp
  | {
      op: "update";
      id: string;
      name?: string;
      durationHours?: number;
      plannedDate?: string;
      notes?: string;
    }
  | { op: "schedule"; id: string; date: string; start: string }
  | { op: "park"; id: string }
  | { op: "remove"; id: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Core request with token, 401-refresh-once, 503-retry-once, 429-no-retry. */
async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  let token: string;
  try {
    token = await getAccessToken();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { ok: false, code: "unauthenticated", message: error.message };
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
          return { ok: false, code: "unauthenticated", message: error.message };
        }
        return { ok: false, code: "network", message: asMessage(error) };
      }
    }

    if (response.ok) {
      const data = (await parseBody(response)) as T;
      return { ok: true, data };
    }

    const failure = await normalizeError(response);

    // 503 internal → back off briefly and retry once.
    if (response.status === 503 && failure.code === "internal" && !retriedInternal) {
      retriedInternal = true;
      await sleep(300);
      continue;
    }

    return failure;
  }
}

/** Read the error envelope. Handles the plain shape and the rejected batch. */
async function normalizeError(response: Response): Promise<ApiError> {
  const status = response.status;
  const payload = (await parseBody(response)) as
    | {
        error?: { code?: string; message?: string };
        rejected?: boolean;
        results?: BatchResultRow[];
      }
    | undefined;

  // Rejected batch: derive a single code if the ops agree.
  if (payload?.rejected && Array.isArray(payload.results)) {
    const codes = payload.results.filter((r) => r.errorCode).map((r) => r.errorCode as string);
    const unanimous = codes.length > 0 && codes.every((c) => c === codes[0]) ? codes[0] : undefined;
    const message = payload.results.find((r) => r.error)?.error ?? "The change was rejected.";
    return { ok: false, code: toClientCode(unanimous, status), message, status };
  }

  const code = payload?.error?.code;
  const message = payload?.error?.message ?? `Request failed (${status}).`;
  return { ok: false, code: toClientCode(code, status), message, status };
}

function toClientCode(code: string | undefined, status: number): ClientCode {
  const known: ErrorCode[] = [
    "unauthorized",
    "permission",
    "scope",
    "read_only",
    "not_found",
    "validation",
    "conflict",
    "ambiguous",
    "rate_limited",
    "internal",
  ];
  if (code && (known as string[]).includes(code)) return code as ErrorCode;
  if (status === 429) return "rate_limited";
  if (status === 503) return "internal";
  if (status === 401) return "unauthorized";
  return "internal";
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
  date?: string;
  from?: string;
  to?: string;
  compact?: boolean;
  includeBacklog?: boolean;
}

/** Build the /schedule query string. A range uses from+to; backlog needs the flag. */
function scheduleQuery(params: ScheduleParams): string {
  const q = new URLSearchParams();
  if (params.date) q.set("date", params.date);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.compact) q.set("compact", "true");
  if (params.includeBacklog) q.set("includeBacklog", "true");
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function getSchedule(date: string, compact = false): Promise<ApiResult<ScheduleResponse>> {
  return request<ScheduleResponse>("GET", PATHS.schedule + scheduleQuery({ date, compact }));
}

/** Read a contiguous [from, to] date range in one call. Response groups days[]. */
export function getScheduleRange(from: string, to: string, compact = false): Promise<ApiResult<ScheduleResponse>> {
  return request<ScheduleResponse>("GET", PATHS.schedule + scheduleQuery({ from, to, compact }));
}

/** Read a day plus the parked-block inbox. The backlog needs includeBacklog=true. */
export function getScheduleWithBacklog(date: string): Promise<ApiResult<ScheduleResponse>> {
  return request<ScheduleResponse>("GET", PATHS.schedule + scheduleQuery({ date, includeBacklog: true }));
}

/** The connected calendars, in picker order, plus the account default. */
export function listCalendars(): Promise<ApiResult<CalendarsResponse>> {
  return request<CalendarsResponse>("GET", PATHS.calendars);
}

export function createEvent(op: Extract<WriteOp, { op: "create" }>): Promise<ApiResult<BatchReceipt>> {
  return request<BatchReceipt>("POST", PATHS.events, { ops: [op] });
}

export function eventsBatch(ops: WriteOp[]): Promise<ApiResult<BatchReceipt>> {
  return request<BatchReceipt>("POST", PATHS.eventsBatch, { ops });
}

/** Update one event in place (PATCH /events/{id}). Send only the changed fields. */
export function updateEvent(id: string, patch: UpdateEventPatch): Promise<ApiResult<BatchReceipt>> {
  return request<BatchReceipt>("PATCH", `${PATHS.events}/${encodeURIComponent(id)}`, patch);
}

export function planSchedule(requests: unknown[]): Promise<ApiResult<Record<string, unknown>>> {
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

// GET /events/search result. The row is lean: no area, activity, or duration.
export interface SearchEvent {
  id: string;
  date: string;
  start: string;
  end: string;
  name: string;
  score?: number;
}

export interface SearchResponse {
  count: number;
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

export function sendFeedback(message: string): Promise<ApiResult<Record<string, unknown>>> {
  return request<Record<string, unknown>>("POST", PATHS.feedback, { message });
}
