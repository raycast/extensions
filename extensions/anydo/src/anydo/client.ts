import { randomBytes } from "crypto";

import { toLocalIso } from "./format";
import { refreshTokens, type OAuthTokens } from "./oauth";
import type {
  AnyDoBoard,
  AnyDoCalendar,
  AnyDoEvent,
  AnyDoList,
  AnyDoSection,
  AnyDoSpace,
  AnyDoTask,
  AnyDoUser,
  GetTasksParams,
  AnyDoSubtask,
  NewTaskInput,
  RecurrenceType,
  TaskType,
  TaskUpdate,
} from "./types";

export const MCP_URL = "https://mcp.any.do/mcp";
export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const EXTENSION_VERSION = "1.0.0";

/**
 * Confirmation token that Any.do's own MCP Apps widget sends with `apply_bulk_task_updates`.
 * Without it the server refuses the call with "This action can only be confirmed from the
 * Any.do preview". The value is the constant hard-coded in the published
 * `ui://anydo/update-task-preview.html` widget (verified against the live server).
 */
export const APP_CALL_TASK_UPDATES = "74347478a1a7_apply_bulk_task_updates";
/** Same idea for the calendar: token hard-coded in ui://anydo/delete-event-preview.html. */
export const APP_CALL_EVENT_DELETES = "00e904cf68af_apply_bulk_event_deletes";

const MAX_PAGES = 20;

export interface AuthSnapshot {
  clientId: string;
  tokens: OAuthTokens;
}

export interface AnyDoClientOptions {
  getAuth: () => Promise<AuthSnapshot>;
  saveTokens: (tokens: OAuthTokens) => Promise<void>;
}

interface HttpResult {
  status: number;
  ok: boolean;
  text: string;
}

interface JsonRpcError {
  code?: number;
  message?: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number;
  result?: unknown;
  error?: JsonRpcError;
}

interface ToolContentBlock {
  type?: string;
  text?: string;
}

interface ToolResult {
  content?: ToolContentBlock[];
  structuredContent?: { data?: unknown };
  isError?: boolean;
}

function newTaskId(): string {
  return randomBytes(16).toString("base64");
}

function decodePayload(text: string): JsonRpcResponse | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  let payload = trimmed;
  if (
    trimmed.startsWith("event:") ||
    trimmed.startsWith("data:") ||
    trimmed.includes("\ndata:")
  ) {
    payload = trimmed
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n")
      .trim();
    if (!payload) return null;
  }
  try {
    return JSON.parse(payload);
  } catch {
    throw new Error(
      `Unreadable response from the Any.do MCP server: ${trimmed.slice(0, 300)}`,
    );
  }
}

function textOf(result: ToolResult): string | undefined {
  const blocks = Array.isArray(result.content) ? result.content : [];
  const text = blocks.find((block) => block.type === "text")?.text;
  return typeof text === "string" ? text : undefined;
}

/** Parses a payload the server may return either as an object or as a JSON string. */
function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

/** Unwraps the `structuredContent.data` / text payload that the Any.do tools return. */
function unwrap(result: unknown): unknown {
  if (!result) return null;
  const tool = result as ToolResult;
  if (tool.isError) {
    throw new Error(
      `Any.do returned an error: ${textOf(tool) ?? "unknown error"}`,
    );
  }
  const structured = tool.structuredContent;
  if (structured && typeof structured === "object" && "data" in structured) {
    const data: unknown = structured.data;
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "result" in data &&
      Object.keys(data as object).length === 1
    ) {
      return (data as { result: unknown }).result;
    }
    return data;
  }
  const text = textOf(tool);
  if (text === undefined) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function describeFailure(method: string, result: HttpResult): string {
  if (result.status === 401) {
    return "Any.do rejected the session (HTTP 401). Sign in again from the “Account” command.";
  }
  return `Any.do request “${method}” failed with HTTP ${result.status}: ${result.text.slice(0, 300)}`;
}

/** Minimal MCP client for Any.do's official remote server (streamable HTTP). */
export class AnyDoClient {
  private sessionId: string | null = null;
  private requestId = 0;
  private readonly options: AnyDoClientOptions;

  constructor(options: AnyDoClientOptions) {
    this.options = options;
  }

  // --- tools -----------------------------------------------------------------

  async getUserInfo(): Promise<AnyDoUser> {
    return unwrap(await this.callTool("get_user_info", {})) as AnyDoUser;
  }

  async getLists(): Promise<AnyDoList[]> {
    return (unwrap(await this.callTool("get_lists", {})) as AnyDoList[]) ?? [];
  }

  async getTask(
    taskId: string,
    taskType: TaskType = "personal_task",
  ): Promise<AnyDoTask> {
    return unwrap(
      await this.callTool("get_task", {
        task_id: taskId,
        task_type: taskType,
      }),
    ) as AnyDoTask;
  }

  async getTasks(
    params: GetTasksParams = {},
  ): Promise<{ items: AnyDoTask[]; nextCursor: string | null }> {
    const data = (unwrap(await this.callTool("get_tasks", { ...params })) ??
      {}) as { items?: AnyDoTask[]; next_cursor?: string | null };
    return { items: data.items ?? [], nextCursor: data.next_cursor ?? null };
  }

  /** Fetches every task, following the server-side pagination. */
  async getAllTasks(params: GetTasksParams = {}): Promise<AnyDoTask[]> {
    const items: AnyDoTask[] = [];
    let cursor: string | undefined = undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await this.getTasks({
        limit: 100,
        ...params,
        ...(cursor ? { cursor } : {}),
      });
      items.push(...result.items);
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
    return items;
  }

  async createTask(input: NewTaskInput): Promise<AnyDoTask> {
    const data = unwrap(
      await this.callTool("create_personal_tasks", {
        tasks: [
          {
            task_id: newTaskId(),
            list_id: input.listId,
            title: input.title,
            status: "unchecked",
            note: input.note ?? null,
            datetime: input.datetime ?? null,
          },
        ],
      }),
    );
    const created = (
      Array.isArray(data)
        ? data[0]
        : ((data as { result?: AnyDoTask[] } | undefined)?.result?.[0] ?? data)
    ) as AnyDoTask | undefined;
    if (!created?.task_id) {
      throw new Error("Any.do did not return the created task.");
    }
    return created as AnyDoTask;
  }

  async updateTasks(updates: TaskUpdate[]): Promise<void> {
    const result = asObject(
      unwrap(
        await this.callTool("apply_bulk_task_updates", {
          task_updates: updates,
          app_call: APP_CALL_TASK_UPDATES,
        }),
      ),
    );
    if (result && result.success === false) {
      throw new Error(
        `Any.do refused the update: ${String(result.error ?? "unknown reason")}`,
      );
    }
  }

  async setStatus(
    task: AnyDoTask,
    status: "unchecked" | "checked",
  ): Promise<void> {
    await this.updateTasks([
      { task_id: task.task_id, task_type: task.task_type, status },
    ]);
  }

  async editTask(
    task: AnyDoTask,
    changes: { title?: string; note?: string; list_id?: string },
  ): Promise<void> {
    await this.updateTasks([
      { task_id: task.task_id, task_type: task.task_type, ...changes },
    ]);
  }

  async moveToList(task: AnyDoTask, listId: string): Promise<void> {
    await this.editTask(task, { list_id: listId });
  }

  async setReminder(task: AnyDoTask, datetime: string): Promise<void> {
    await this.callTool("set_reminder", {
      task_id: task.task_id,
      task_type: task.task_type,
      datetime,
    });
  }

  async addSubtask(task: AnyDoTask, title: string): Promise<void> {
    await this.callTool("create_subtasks", {
      task_id: task.task_id,
      task_type: task.task_type,
      subtasks: [
        {
          task_id: task.task_id,
          subtask_id: newTaskId(),
          title,
          status: "unchecked",
        },
      ],
    });
  }

  /** Renames or re-checks a single subtask (the subtask tools are not preview-gated). */
  async updateSubtask(
    task: AnyDoTask,
    subtaskId: string,
    changes: { title?: string; status?: "unchecked" | "checked" },
  ): Promise<void> {
    await this.callTool("update_subtask", {
      task_id: task.task_id,
      subtask_id: subtaskId,
      task_type: task.task_type,
      ...changes,
    });
  }

  async getSubtasks(task: AnyDoTask): Promise<AnyDoSubtask[]> {
    return (unwrap(
      await this.callTool("get_subtasks", {
        task_id: task.task_id,
        task_type: task.task_type,
      }),
    ) ?? []) as AnyDoSubtask[];
  }

  /** Recurring reminders: repeat every day / week / month / year. */
  async setRecurringReminder(
    task: AnyDoTask,
    startDatetime: string,
    recurrenceType: RecurrenceType,
    options: { interval?: number } = {},
  ): Promise<void> {
    await this.callTool("set_recurring_reminder", {
      task_id: task.task_id,
      recurrence_type: recurrenceType,
      start_datetime: startDatetime,
      ...(options.interval ? { recurrence_interval: options.interval } : {}),
    });
  }

  // --- calendars & history ---------------------------------------------------

  async getConnectedCalendars(): Promise<AnyDoCalendar[]> {
    return (unwrap(await this.callTool("get_connected_calendars", {})) ??
      []) as AnyDoCalendar[];
  }

  async getEvents(
    calendarIds: string[],
    from: Date,
    to: Date,
  ): Promise<AnyDoEvent[]> {
    return (unwrap(
      await this.callTool("get_events_for_date_range", {
        calendar_ids: calendarIds,
        from_datetime: toLocalIso(from),
        to_datetime: toLocalIso(to),
      }),
    ) ?? []) as AnyDoEvent[];
  }

  async createEvent(
    calendarId: string,
    event: {
      title: string;
      startTime: string;
      endTime: string;
      location?: string;
    },
  ): Promise<AnyDoEvent[]> {
    const data = unwrap(
      await this.callTool("create_calendar_events", {
        calendar_id: calendarId,
        events: [
          {
            title: event.title,
            start_time: event.startTime,
            end_time: event.endTime,
            ...(event.location ? { location: event.location } : {}),
          },
        ],
      }),
    );
    return (
      Array.isArray(data)
        ? data
        : ((data as { result?: AnyDoEvent[] })?.result ?? [])
    ) as AnyDoEvent[];
  }

  /** Deletes calendar events (needs the same widget confirmation token as task updates). */
  async deleteEvents(events: AnyDoEvent[]): Promise<void> {
    const entries = events
      .map((event) => ({
        event_id: event.event_id ?? event.id ?? "",
        // Any.do returns the calendar id inside `name`, not `calendar_id`.
        calendar_id: event.calendar_id ?? event.name ?? "",
        event_url: event.event_url ?? event.url ?? "",
      }))
      .filter(
        (entry) => entry.event_id && entry.calendar_id && entry.event_url,
      );

    if (entries.length === 0) {
      throw new Error(
        "Nothing to delete: the event objects carry no id/calendar/url.",
      );
    }

    const result = asObject(
      unwrap(
        await this.callTool("apply_bulk_event_deletes", {
          event_deletes: entries,
          app_call: APP_CALL_EVENT_DELETES,
        }),
      ),
    );
    if (result && result.success === false) {
      throw new Error(
        `Any.do refused the delete: ${String(result.error ?? "unknown reason")}`,
      );
    }
  }

  /** Completed *workspace* tasks; Any.do's API does not expose completed personal tasks. */
  async getCompletedTasks(
    from: Date,
    to: Date,
    publicUserId: string,
  ): Promise<AnyDoTask[]> {
    const items: AnyDoTask[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 5; page++) {
      const data = (unwrap(
        await this.callTool("get_completed_tasks_for_date_range", {
          from_datetime: toLocalIso(from),
          to_datetime: toLocalIso(to),
          public_user_id: publicUserId,
          limit: 100,
          ...(cursor ? { cursor } : {}),
        }),
      ) ?? {}) as { items?: AnyDoTask[]; next_cursor?: string | null };
      items.push(...(data.items ?? []));
      if (!data.next_cursor) break;
      cursor = data.next_cursor;
    }
    return items;
  }

  // --- workspaces ------------------------------------------------------------

  async getActiveSpaces(): Promise<AnyDoSpace[]> {
    return (unwrap(await this.callTool("get_active_spaces", {})) ??
      []) as AnyDoSpace[];
  }

  async getWorkspaceBoards(spaceId?: string): Promise<AnyDoBoard[]> {
    return (unwrap(
      await this.callTool(
        "get_workspace_boards",
        spaceId ? { space_id: spaceId } : {},
      ),
    ) ?? []) as AnyDoBoard[];
  }

  async getBoardSections(boardId: string): Promise<AnyDoSection[]> {
    return (unwrap(
      await this.callTool("get_board_sections", { board_id: boardId }),
    ) ?? []) as AnyDoSection[];
  }

  // --- transport -------------------------------------------------------------

  private async http(
    method: string,
    params: unknown,
    accessToken: string,
  ): Promise<HttpResult> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${accessToken}`,
      "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;

    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++this.requestId,
        method,
        params,
      }),
    });
    const sessionId = response.headers.get("mcp-session-id");
    if (sessionId) this.sessionId = sessionId;
    return {
      status: response.status,
      ok: response.ok,
      text: await response.text(),
    };
  }

  private async post(
    method: string,
    params: unknown,
    retryOn401 = true,
  ): Promise<unknown> {
    const auth = await this.options.getAuth();
    let result = await this.http(method, params, auth.tokens.access_token);

    if (result.status === 401 && retryOn401 && auth.tokens.refresh_token) {
      const refreshed = await refreshTokens(
        auth.clientId,
        auth.tokens.refresh_token,
      );
      const merged: OAuthTokens = {
        ...refreshed,
        refresh_token: refreshed.refresh_token ?? auth.tokens.refresh_token,
      };
      await this.options.saveTokens(merged);
      this.sessionId = null;
      await this.ensureSession();
      result = await this.http(method, params, merged.access_token);
    }

    if (!result.ok) throw new Error(describeFailure(method, result));
    const payload = decodePayload(result.text);
    if (payload?.error) {
      throw new Error(
        `Any.do MCP error in “${method}”: ${payload.error.message ?? JSON.stringify(payload.error)}`,
      );
    }
    return payload?.result;
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionId) return;
    await this.post(
      "initialize",
      {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "raycast-anydo", version: EXTENSION_VERSION },
      },
      false,
    );
    try {
      await this.post("notifications/initialized", {}, false);
    } catch {
      // Notifications are best-effort: older/stateless servers may reject them.
    }
  }

  private async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    await this.ensureSession();
    return this.post("tools/call", { name, arguments: args });
  }
}
