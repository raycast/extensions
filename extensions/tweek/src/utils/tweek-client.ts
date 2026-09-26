import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  BulkOperationResult,
  BulkUpdateItem,
  CreateTaskInput,
  ExtensionPreferences,
  ListTasksParams,
  PaginatedTasksResponse,
  TweekCalendar,
  TweekCustomColor,
  TweekTask,
  UpdateTaskInput,
  UpdateType,
} from "../types";
import { getUserTimezone } from "./date-utils";

const REST_BASE_URL = "https://tweek.so/api/v1";
const MAX_BATCH_SIZE = 50;
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;

export class TweekApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly isUnauthorized: boolean;
  public readonly isUpgradeRequired: boolean;
  public readonly isNetworkError: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      isUnauthorized?: boolean;
      isUpgradeRequired?: boolean;
      isNetworkError?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "TweekApiError";
    this.status = options.status ?? 500;
    this.code = options.code;
    this.isUnauthorized =
      options.isUnauthorized ?? (this.status === 401 || this.status === 403);
    this.isUpgradeRequired =
      options.isUpgradeRequired ??
      (this.status === 400 &&
        /upgrade|paid plan|custom color|free/i.test(message));
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

function getAuthHeaders(customApiKey?: string): Record<string, string> {
  let apiKey = customApiKey;
  if (!apiKey) {
    try {
      const prefs = getPreferenceValues<ExtensionPreferences>();
      apiKey = prefs.apiKey?.trim();
    } catch {
      apiKey = process.env.TWEEK_API_KEY?.trim() || "";
    }
  }

  if (!apiKey) {
    throw new TweekApiError(
      "Missing Tweek API Key. Please open Raycast Preferences and enter your Tweek Personal API Key.",
      { status: 401, isUnauthorized: true },
    );
  }

  // Support both JWT/Bearer tokens and Personal API keys (X-API-Key)
  const isBearerToken =
    apiKey.startsWith("eyJ") || apiKey.toLowerCase().startsWith("bearer ");
  if (isBearerToken) {
    const token = apiKey.replace(/^bearer\s+/i, "");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  return {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function fetchWithRetry<T>(
  path: string,
  init: RequestInit = {},
  customApiKey?: string,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${REST_BASE_URL}${path}`;
  const headers = {
    ...getAuthHeaders(customApiKey),
    ...(init.headers as Record<string, string> | undefined),
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 204) {
        return {} as T;
      }

      const rawText = await response.text();
      let parsed: unknown = {};
      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = { message: rawText };
        }
      }

      if (!response.ok) {
        const errorMessage =
          (parsed as { message?: string; error?: string })?.message ||
          (parsed as { error?: string })?.error ||
          `Tweek API error (${response.status} ${response.statusText})`;

        const apiErr = new TweekApiError(errorMessage, {
          status: response.status,
          isUnauthorized: response.status === 401 || response.status === 403,
        });

        // Do not retry client errors (4xx), except 429 Too Many Requests
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          throw apiErr;
        }
        lastError = apiErr;
      } else {
        return parsed as T;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (
        err instanceof TweekApiError &&
        err.status >= 400 &&
        err.status < 500 &&
        err.status !== 429
      ) {
        throw err;
      }

      const isAbort = err instanceof Error && err.name === "AbortError";
      lastError =
        err instanceof TweekApiError
          ? err
          : new TweekApiError(
              isAbort
                ? "Network request to Tweek timed out."
                : err instanceof Error
                  ? err.message
                  : "Network error while communicating with Tweek.",
              { status: 0, isNetworkError: true },
            );
    }

    if (attempt < MAX_RETRIES) {
      const backoffMs = 350 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new TweekApiError("Failed to connect to Tweek API", {
        isNetworkError: true,
      });
}

/**
 * 1. list_calendars() — Fetches user's calendars and their embedded someday-lists.
 */
export async function list_calendars(
  apiKey?: string,
): Promise<TweekCalendar[]> {
  const res = await fetchWithRetry<
    TweekCalendar[] | { calendars?: TweekCalendar[]; data?: TweekCalendar[] }
  >("/calendars", { method: "GET" }, apiKey);

  if (Array.isArray(res)) {
    return res.map((cal) => ({
      ...cal,
      lists: Array.isArray(cal.lists) ? cal.lists : [],
    }));
  }

  const list = res.calendars || res.data || [];
  return list.map((cal) => ({
    ...cal,
    lists: Array.isArray(cal.lists) ? cal.lists : [],
  }));
}

/**
 * 2. list_colors() — Fetches user's custom colors.
 */
export async function list_colors(
  apiKey?: string,
): Promise<TweekCustomColor[]> {
  try {
    const res = await fetchWithRetry<
      | TweekCustomColor[]
      | { colors?: TweekCustomColor[]; data?: TweekCustomColor[] }
    >("/custom-colors", { method: "GET" }, apiKey);

    if (Array.isArray(res)) {
      return res;
    }
    return res.colors || res.data || [];
  } catch (err) {
    // Free accounts or restricted scopes may not have custom colors
    if (
      err instanceof TweekApiError &&
      (err.status === 400 || err.status === 403 || err.status === 404)
    ) {
      return [];
    }
    throw err;
  }
}

/**
 * 3. list_tasks(calendarId, options?) — Lists tasks in a calendar.
 * Automatically adds `expand=occurrences` and user's IANA timezone when dateFrom & dateTo are given.
 */
export async function list_tasks(
  calendarIdOrParams: string | ListTasksParams,
  options: Omit<ListTasksParams, "calendarId"> = {},
  apiKey?: string,
): Promise<PaginatedTasksResponse> {
  const params: ListTasksParams =
    typeof calendarIdOrParams === "string"
      ? { calendarId: calendarIdOrParams, ...options }
      : calendarIdOrParams;

  const query = new URLSearchParams();
  query.set("calendarId", params.calendarId);

  if (params.listId) {
    query.set("listId", params.listId);
  }

  const hasDateWindow = Boolean(params.dateFrom && params.dateTo);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);

  if (hasDateWindow && params.expand !== false) {
    query.set("expand", "occurrences");
    query.set("timezone", params.timezone || getUserTimezone());
  } else if (params.startAt) {
    query.set("startAt", params.startAt);
  }

  const res = await fetchWithRetry<PaginatedTasksResponse | TweekTask[]>(
    `/tasks?${query.toString()}`,
    { method: "GET" },
    apiKey,
  );

  if (Array.isArray(res)) {
    return {
      data: res.filter((t) => !t.deleted),
      nextDocId: null,
    };
  }

  return {
    data: (res.data || []).filter((t) => !t.deleted),
    pageSize: res.pageSize,
    nextDocId: res.nextDocId ?? null,
  };
}

/**
 * 4. get_task(taskId) — Fetches full details of a single task (or virtual occurrence).
 */
export async function get_task(
  taskId: string,
  apiKey?: string,
): Promise<TweekTask> {
  return fetchWithRetry<TweekTask>(
    `/tasks/${encodeURIComponent(taskId)}`,
    { method: "GET" },
    apiKey,
  );
}

/**
 * 5. create_task(input) — Creates a new task in Tweek.
 * Includes automatic fallback if a paid color/feature is rejected on a Free account.
 */
export async function create_task(
  input: CreateTaskInput,
  apiKey?: string,
): Promise<{ id: string }> {
  const payload: Record<string, unknown> = {
    calendarId: input.calendarId,
    text: input.text.trim(),
    done: input.done ?? false,
  };

  if (input.listId) {
    payload.listId = input.listId;
  } else {
    payload.date = input.date ?? new Date().toISOString().slice(0, 10);
  }

  if (input.color && input.color !== "blank") {
    payload.color = input.color;
  }
  if (input.note) payload.note = input.note;
  if (input.notifyAt) payload.notifyAt = input.notifyAt;
  if (input.checklist && input.checklist.length > 0) {
    payload.checklist = input.checklist.map((item, idx) => ({
      id: item.id || `sub_${Date.now()}_${idx}`,
      text: item.text,
      done: item.done ?? false,
    }));
  }
  if (typeof input.freq === "number" && input.freq > 0) {
    payload.freq = input.freq;
    payload.dtStart =
      input.dtStart ||
      (typeof payload.date === "string" ? payload.date : undefined);
    if (input.freq === 7 && input.recurrence) {
      payload.recurrence = input.recurrence;
    }
  }
  if (typeof input.gcal === "boolean") {
    payload.gcal = input.gcal;
  }

  try {
    return await fetchWithRetry<{ id: string }>(
      "/tasks",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      apiKey,
    );
  } catch (err) {
    // Graceful fallback if user is on Tweek Free plan and selected a paid color/recurrence
    if (
      err instanceof TweekApiError &&
      err.status === 400 &&
      err.isUpgradeRequired
    ) {
      const fallbackPayload: Record<string, unknown> = {
        calendarId: input.calendarId,
        text: input.text.trim(),
        done: input.done ?? false,
        date: payload.date,
        listId: payload.listId,
        note: input.note,
        color:
          input.color === "pink" || input.color === "yellowish"
            ? input.color
            : "blank",
      };
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Saved with Free Plan defaults",
          message:
            "Paid color/recurrence features were downgraded to Free plan equivalents.",
        });
      } catch {
        // Ignore toast outside Raycast runtime (e.g. unit tests)
      }
      return fetchWithRetry<{ id: string }>(
        "/tasks",
        {
          method: "POST",
          body: JSON.stringify(fallbackPayload),
        },
        apiKey,
      );
    }
    throw err;
  }
}

/**
 * 6. update_task(taskId, updates, updateType?) — Updates an existing task or recurring series.
 * If `calendarId` is changed from `originalCalendarId`, migrates the task across calendars transparently.
 */
export async function update_task(
  taskId: string,
  updates: UpdateTaskInput & { originalCalendarId?: string },
  updateType?: UpdateType,
  apiKey?: string,
): Promise<{ id: string; updated: boolean }> {
  const { originalCalendarId, calendarId, ...patchFields } = updates;

  // Cross-calendar migration support since Tweek PATCH fixes calendarId
  if (calendarId && originalCalendarId && calendarId !== originalCalendarId) {
    let existingTask: TweekTask | null = null;
    try {
      existingTask = await get_task(taskId, apiKey);
    } catch {
      existingTask = null;
    }

    const created = await create_task(
      {
        calendarId,
        text: patchFields.text ?? existingTask?.text ?? "Untitled Task",
        done: patchFields.done ?? existingTask?.done ?? false,
        date:
          patchFields.date !== undefined
            ? patchFields.date
            : existingTask?.date,
        listId:
          patchFields.listId !== undefined
            ? patchFields.listId
            : existingTask?.listId,
        color:
          patchFields.color !== undefined
            ? patchFields.color
            : existingTask?.color,
        note:
          patchFields.note !== undefined
            ? patchFields.note
            : existingTask?.note,
        checklist:
          patchFields.checklist !== undefined
            ? patchFields.checklist
            : (existingTask?.checklist ?? undefined),
        freq:
          patchFields.freq !== undefined
            ? patchFields.freq
            : existingTask?.freq,
        dtStart:
          patchFields.dtStart !== undefined
            ? patchFields.dtStart
            : existingTask?.dtStart,
      },
      apiKey,
    );

    await delete_task(taskId, updateType || "only_this", apiKey);
    return { id: created.id, updated: true };
  }

  const query = updateType
    ? `?updateType=${encodeURIComponent(updateType)}`
    : "";

  const sanitizedPatch: Record<string, unknown> = {};
  if (patchFields.text !== undefined) sanitizedPatch.text = patchFields.text;
  if (patchFields.done !== undefined) sanitizedPatch.done = patchFields.done;
  if (patchFields.date !== undefined) sanitizedPatch.date = patchFields.date;
  if (patchFields.listId !== undefined)
    sanitizedPatch.listId = patchFields.listId;
  if (patchFields.note !== undefined) sanitizedPatch.note = patchFields.note;
  if (patchFields.color !== undefined) sanitizedPatch.color = patchFields.color;
  if (patchFields.notifyAt !== undefined)
    sanitizedPatch.notifyAt = patchFields.notifyAt;
  if (patchFields.checklist !== undefined) {
    sanitizedPatch.checklist = patchFields.checklist;
  }
  if (typeof patchFields.freq === "number" && patchFields.freq > 0) {
    sanitizedPatch.freq = patchFields.freq;
    if (patchFields.dtStart) sanitizedPatch.dtStart = patchFields.dtStart;
    if (patchFields.freq === 7 && patchFields.recurrence) {
      sanitizedPatch.recurrence = patchFields.recurrence;
    }
  }

  try {
    await fetchWithRetry<unknown>(
      `/tasks/${encodeURIComponent(taskId)}${query}`,
      {
        method: "PATCH",
        body: JSON.stringify(sanitizedPatch),
      },
      apiKey,
    );
  } catch (err) {
    // Graceful fallback if user is on Tweek Free plan and edited with paid fields/colors
    if (
      err instanceof TweekApiError &&
      err.status === 400 &&
      err.isUpgradeRequired
    ) {
      const freeSafePatch: Record<string, unknown> = {};
      if (sanitizedPatch.text !== undefined)
        freeSafePatch.text = sanitizedPatch.text;
      if (sanitizedPatch.done !== undefined)
        freeSafePatch.done = sanitizedPatch.done;
      if (sanitizedPatch.date !== undefined)
        freeSafePatch.date = sanitizedPatch.date;
      if (sanitizedPatch.listId !== undefined)
        freeSafePatch.listId = sanitizedPatch.listId;
      if (sanitizedPatch.note !== undefined)
        freeSafePatch.note = sanitizedPatch.note;
      if (sanitizedPatch.color !== undefined) {
        freeSafePatch.color =
          sanitizedPatch.color === "pink" ||
          sanitizedPatch.color === "yellowish"
            ? sanitizedPatch.color
            : "blank";
      }

      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Updated with Free Plan defaults",
          message:
            "Paid color/recurrence/checklist fields were downgraded for Free plan.",
        });
      } catch {
        // Ignore toast outside Raycast runtime
      }

      await fetchWithRetry<unknown>(
        `/tasks/${encodeURIComponent(taskId)}${query}`,
        {
          method: "PATCH",
          body: JSON.stringify(freeSafePatch),
        },
        apiKey,
      );
    } else {
      throw err;
    }
  }

  return { id: taskId, updated: true };
}

/**
 * 7. delete_task(taskId, updateType?) — Deletes a task or recurring occurrence/series.
 */
export async function delete_task(
  taskId: string,
  updateType?: UpdateType,
  apiKey?: string,
): Promise<{ id: string; deleted: boolean }> {
  const query = updateType
    ? `?updateType=${encodeURIComponent(updateType)}`
    : "";
  await fetchWithRetry<unknown>(
    `/tasks/${encodeURIComponent(taskId)}${query}`,
    {
      method: "DELETE",
    },
    apiKey,
  );
  return { id: taskId, deleted: true };
}

/**
 * 8. complete_task(taskId, done?, updateType?) — Marks a task done (or toggles completion).
 */
export async function complete_task(
  taskId: string,
  done: boolean = true,
  updateType?: UpdateType,
  apiKey?: string,
): Promise<{ id: string; done: boolean }> {
  await update_task(taskId, { done }, updateType, apiKey);
  return { id: taskId, done };
}

/**
 * 9. bulk_create_tasks(tasks) — Creates up to 50 tasks per batch, reporting succeeded & failed items.
 */
export async function bulk_create_tasks(
  tasks: CreateTaskInput[],
  apiKey?: string,
): Promise<BulkOperationResult> {
  const succeeded: Array<{ index: number; id: string }> = [];
  const failed: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < tasks.length; i += MAX_BATCH_SIZE) {
    const chunk = tasks.slice(i, i + MAX_BATCH_SIZE);
    const results = await Promise.allSettled(
      chunk.map((item) => create_task(item, apiKey)),
    );

    results.forEach((res, offset) => {
      const globalIndex = i + offset;
      if (res.status === "fulfilled") {
        succeeded.push({ index: globalIndex, id: res.value.id });
      } else {
        failed.push({
          index: globalIndex,
          error:
            res.reason instanceof Error ? res.reason.message : "Unknown error",
        });
      }
    });
  }

  return { succeeded, failed };
}

/**
 * 10. bulk_update_tasks(updates) — Updates multiple tasks concurrently in batches of up to 50.
 */
export async function bulk_update_tasks(
  updates: BulkUpdateItem[],
  apiKey?: string,
): Promise<BulkOperationResult> {
  const succeeded: Array<{ index: number; id: string }> = [];
  const failed: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < updates.length; i += MAX_BATCH_SIZE) {
    const chunk = updates.slice(i, i + MAX_BATCH_SIZE);
    const results = await Promise.allSettled(
      chunk.map(({ taskId, updateType, ...fields }) =>
        update_task(taskId, fields, updateType, apiKey),
      ),
    );

    results.forEach((res, offset) => {
      const globalIndex = i + offset;
      if (res.status === "fulfilled") {
        succeeded.push({ index: globalIndex, id: res.value.id });
      } else {
        failed.push({
          index: globalIndex,
          error:
            res.reason instanceof Error ? res.reason.message : "Unknown error",
        });
      }
    });
  }

  return { succeeded, failed };
}

/**
 * 11. bulk_complete_tasks(taskIds, done) — Marks multiple tasks completed/uncompleted.
 */
export async function bulk_complete_tasks(
  taskIds: string[],
  done: boolean = true,
  apiKey?: string,
): Promise<BulkOperationResult> {
  return bulk_update_tasks(
    taskIds.map((taskId) => ({ taskId, done })),
    apiKey,
  );
}

/**
 * 12. bulk_delete_tasks(taskIds) — Deletes multiple tasks in batches.
 */
export async function bulk_delete_tasks(
  taskIds: string[],
  apiKey?: string,
): Promise<BulkOperationResult> {
  const succeeded: Array<{ index: number; id: string }> = [];
  const failed: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < taskIds.length; i += MAX_BATCH_SIZE) {
    const chunk = taskIds.slice(i, i + MAX_BATCH_SIZE);
    const results = await Promise.allSettled(
      chunk.map((id) => delete_task(id, undefined, apiKey)),
    );

    results.forEach((res, offset) => {
      const globalIndex = i + offset;
      if (res.status === "fulfilled") {
        succeeded.push({ index: globalIndex, id: res.value.id });
      } else {
        failed.push({
          index: globalIndex,
          error:
            res.reason instanceof Error ? res.reason.message : "Unknown error",
        });
      }
    });
  }

  return { succeeded, failed };
}
