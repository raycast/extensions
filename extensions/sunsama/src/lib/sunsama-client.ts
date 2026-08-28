/**
 * Sunsama operations over the official MCP server (tools + resources).
 * Auth/transport live in `mcp.ts`; this module maps MCP JSON to UI types.
 */
import { LocalStorage } from "@raycast/api";
import { callTool, callToolJson, readResourceJson } from "./mcp";
import { parseDuration } from "./time";
import { htmlToMarkdown } from "./notes";
import { Channel, CreateTaskInput, Subtask, SubtaskInput, Task } from "./types";
import { isAfterDay, todayString } from "./date";

// ---------------------------------------------------------------------------
// MCP wire shapes
// ---------------------------------------------------------------------------

interface McpSubtask {
  _id: string;
  title: string;
  completed: boolean;
  timeEstimate?: string; // human string, e.g. "1 hours and 30 minutes"
}

interface McpTask {
  _id: string;
  title: string;
  notes?: string; // HTML
  completed: boolean;
  timeEstimate?: string; // human string
  sortOrder?: number;
  /** The day the task is scheduled to, YYYY-MM-DD. */
  scheduledDate?: string;
  channel?: string;
  subtasks?: McpSubtask[];
  integrationDetails?: { service?: string; url?: string };
  actualTimeSpent?: { total?: string };
  projectedTimeEntries?: Array<{ startTime?: string; startDate?: string }>;
  /** Present on calendar-imported tasks; false = anchored to another day. */
  isScheduledOnPanelDate?: boolean;
}

interface ActiveTimer {
  taskId?: string;
  subtaskId?: string;
  /** ISO start of the running session, when the server exposes one. */
  start?: string;
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

async function searchChannelsRaw(
  searchText: string,
  extra: Record<string, unknown> = {},
): Promise<Channel[]> {
  const data = await callToolJson<{ channels?: Channel[] }>("search_channels", {
    searchText,
    numResults: 25,
    ...extra,
  });
  return data.channels ?? [];
}

// Deliberately unalike, because the server ranks semantically rather than by
// substring and caps each answer at 25. Seeds drawn from different vocabularies
// surface different corners of a large category; together they cover far more
// of it than any single query does.
const CHANNEL_SEEDS = [
  "project client website company brand",
  "personal home admin life chores",
  "media health property law manufacturing ministry",
];

// Themed seeds pull channels whose names carry meaning, which leaves out the
// ones named after a bare domain or an unrelated word. A single letter matches
// nothing in particular, so the server falls back to a broad spread and those
// surface too. Run unscoped, since the spread is the point.
const BROAD_SEEDS = ["a", " "];

/**
 * Every channel we can see, sorted by name.
 *
 * The MCP server has no list-all endpoint — only a semantic search capped at 25
 * results — so the list is assembled by asking each category for its channels
 * with a couple of different seed queries and merging what comes back. A
 * category with fewer than 25 channels comes back complete; a larger one is
 * best-effort. That's why the pickers keep an escape hatch for a channel that
 * isn't in the list.
 */
export async function getAllChannels(): Promise<Channel[]> {
  const categories = (
    await searchChannelsRaw("category", { isCategory: true })
  ).filter((c) => c.isCategory);

  // Never send `isCategory: false` — pairing it with categoryStreamId makes the
  // server return an empty set for a query that otherwise matches fine.
  // Categories are dropped from the merged result below instead.
  const lookups = [
    ...categories.flatMap((c) =>
      CHANNEL_SEEDS.map((seed) =>
        searchChannelsRaw(seed, { categoryStreamId: c.id }),
      ),
    ),
    ...BROAD_SEEDS.map((seed) => searchChannelsRaw(seed)),
  ];

  // One failed lookup shouldn't empty the picker.
  const results = await Promise.all(lookups.map((p) => p.catch(() => [])));

  const byId = new Map<string, Channel>();
  for (const list of results) {
    for (const channel of list) {
      if (!channel.isCategory) byId.set(channel.id, channel);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const DEFAULT_CHANNEL_KEY = "sunsama-default-channel";

export interface DefaultChannel {
  id: string;
  name: string;
}

/**
 * The channel new tasks default to, chosen via the Set Default Channel command.
 *
 * This lives in LocalStorage rather than an extension preference because
 * Raycast preference dropdowns are declared statically in the manifest and
 * can't be populated from the channel list at runtime.
 */
export async function getDefaultChannel(): Promise<DefaultChannel | null> {
  const raw = await LocalStorage.getItem<string>(DEFAULT_CHANNEL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DefaultChannel;
  } catch {
    return null;
  }
}

export async function setDefaultChannel(
  channel: DefaultChannel | null,
): Promise<void> {
  if (channel)
    await LocalStorage.setItem(DEFAULT_CHANNEL_KEY, JSON.stringify(channel));
  else await LocalStorage.removeItem(DEFAULT_CHANNEL_KEY);
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

function minutes(human: string | undefined): number | undefined {
  const parsed = human ? parseDuration(human) : null;
  return parsed && parsed > 0 ? parsed : undefined;
}

/**
 * Extract the running timer from the active-timer resource. Observed shape:
 *
 *   {"hasActiveTimer": true, "activeTimer": {
 *      "taskId": "...", "taskTitle": "...", "startTime": "<ISO>",
 *      "subtaskId": "...", "subtaskTitle": "...",
 *      "theSubtaskNotTheTaskIsBeingTimed": true }}
 *
 * `subtaskId` is present only while a subtask is the thing being timed.
 */
function normalizeActiveTimer(raw: unknown): ActiveTimer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (k: string) =>
    typeof r[k] === "string" ? (r[k] as string) : undefined;
  const taskId = str("taskId");
  if (!taskId) return null;
  const startTime = str("startTime");
  return {
    taskId,
    subtaskId: str("subtaskId"),
    start:
      startTime && Number.isFinite(Date.parse(startTime))
        ? startTime
        : undefined,
  };
}

/**
 * The running timer, if any. Fetched separately from the day's tasks so the
 * list never waits on it: it only decorates rows, and the day resource is by
 * far the slower of the two calls.
 */
export async function getActiveTimer(): Promise<ActiveTimer | null> {
  const data = await readResourceJson<{ activeTimer?: unknown }>(
    "sunsama://active-timer",
  );
  return normalizeActiveTimer(data.activeTimer);
}

/**
 * Fold the running timer into already-projected tasks. Kept out of the fetch
 * so the two requests can land independently.
 */
export function withActiveTimer(tasks: Task[], timer: ActiveTimer | null) {
  if (!timer) return tasks;
  return tasks.map((task) => {
    if (timer.taskId !== task.id) return task;
    // Only tick when the server actually reports a session start. Substituting
    // "now" would restart the counter on every refetch and could double-count
    // against a tracked total that already includes the running session.
    return {
      ...task,
      isRunning: true,
      timerStart: timer.start,
      ownTimerRunning: !timer.subtaskId,
      subtasks: task.subtasks.map((s) =>
        s.id === timer.subtaskId
          ? { ...s, isRunning: true, timerStart: timer.start }
          : s,
      ),
    };
  });
}

function projectTask(t: McpTask): Task {
  const totalSeconds =
    (parseDuration(t.actualTimeSpent?.total ?? "") ?? 0) * 60;

  // Earliest calendar slot start, shown as Sunsama formats it (e.g. "9:30 AM").
  const startTime = (t.projectedTimeEntries ?? [])
    .filter((e) => e.startTime)
    .sort(
      (a, b) => Date.parse(a.startDate ?? "") - Date.parse(b.startDate ?? ""),
    )[0]?.startTime;

  // Timer state is folded in later by `withActiveTimer`, once that separate
  // request lands.
  const subtasks: Subtask[] = (t.subtasks ?? []).map((s) => ({
    id: s._id,
    title: s.title,
    completed: s.completed,
    timeEstimate: minutes(s.timeEstimate),
    isRunning: false,
  }));

  return {
    id: t._id,
    title: t.title,
    notes: htmlToMarkdown(t.notes) || undefined,
    completed: t.completed,
    timeEstimate: minutes(t.timeEstimate),
    channelName: t.channel || undefined,
    integrationUrl: t.integrationDetails?.url,
    integrationService: t.integrationDetails?.service,
    subtasks,
    isRunning: false,
    trackedSeconds: totalSeconds,
    ownTimerRunning: false,
    startTime,
  };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface DayTasks {
  /** The tasks to display, in the day's order. */
  tasks: Task[];
  /**
   * Every task id on the day in order, including the ones filtered out of
   * `tasks`. Reordering has to send the complete set or the omitted tasks get
   * relocated — see `reorderDay`.
   */
  allIds: string[];
}

export async function getTasksForDay(day: string): Promise<DayTasks> {
  const data = await readResourceJson<{ tasks?: McpTask[] }>(
    `sunsama://tasks/${day}`,
  );
  const ordered = (data.tasks ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return {
    // Two kinds of task come back that don't belong on this day, and both are
    // hidden rather than dropped — they stay in `allIds` so reordering doesn't
    // relocate them:
    //   - Calendar imports anchored elsewhere (the server rolls incomplete past
    //     events forward, but Sunsama keeps an event on its own day).
    //   - Tasks already moved to a later day. The day resource keeps returning
    //     those, so without this a task snoozed to tomorrow stays on today.
    //     Earlier days are kept on purpose: that's a rolled-over task.
    tasks: ordered
      .filter((t) => t.isScheduledOnPanelDate !== false)
      .filter((t) => !(t.scheduledDate && isAfterDay(t.scheduledDate, day)))
      .map(projectTask),
    allIds: ordered.map((t) => t._id),
  };
}

/** Fetch a single task fresh (used by the subtasks view to stay in sync). */
export async function getTask(taskId: string): Promise<Task | null> {
  const data = await callToolJson<{ task?: McpTask } & McpTask>(
    "get_task_by_id",
    { taskId },
  );
  const t = data.task ?? (data._id ? data : undefined);
  return t ? projectTask(t) : null;
}

/** Creates the task and returns its final title, which the server sets from a
 * linked item when no title was given. */
export async function createTask(input: CreateTaskInput): Promise<string> {
  const args: Record<string, unknown> = {
    day: input.day,
    position: input.position ?? "top",
  };
  // With a URL and no explicit title, Sunsama titles the task from the item.
  if (input.title?.trim()) args.title = input.title.trim();
  if (input.url) args.integrationUrl = input.url;
  if (input.notes) args.notes = input.notes;
  if (input.channel) args.channel = input.channel;
  if (typeof input.timeEstimate === "number")
    args.timeEstimate = input.timeEstimate;
  if (input.subtasks?.length)
    args.subtasks = input.subtasks.map((s) => ({ title: s.title }));

  const text = await callTool("create_task", args);
  // Best-effort: pull the created title out of the JSON reply for the HUD.
  try {
    const parsed = JSON.parse(text) as {
      task?: { title?: string };
      title?: string;
    };
    const title = parsed.task?.title ?? parsed.title;
    if (title) return title;
  } catch {
    // non-JSON reply — fall through
  }
  return input.title?.trim() || input.url || "New task";
}

export async function completeTask(taskId: string): Promise<void> {
  await callTool("mark_task_as_completed", {
    taskId,
    finishedDay: todayString(),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  await callTool("delete_task", { taskId });
}

/** Move a task to another day (YYYY-MM-DD), or to the backlog when null. */
export async function rescheduleTask(
  taskId: string,
  day: string | null,
): Promise<void> {
  if (day) await callTool("move_task_to_day", { taskId, calendarDay: day });
  else await callTool("move_task_to_backlog", { taskId });
}

/**
 * Apply a day's order.
 *
 * `taskIds` must list **every** task on the day, not just the visible ones.
 * The server rewrites the whole day's sort orders from this list: ids that are
 * passed are laid out in the given order, and any task left out is pushed after
 * them. Sending a partial list therefore relocates the tasks it omits — a
 * one-id call was observed moving an unrelated task from first to last.
 */
export async function reorderDay(
  day: string,
  taskIds: string[],
): Promise<void> {
  await callTool("reorder_tasks", { calendarDay: day, taskIds });
}

// ---------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------

export async function editTitle(taskId: string, title: string): Promise<void> {
  await callTool("edit_task_title", { taskId, title });
}

/** Edit a task's notes/description as Markdown (replaces the whole body). */
export async function editNotes(
  taskId: string,
  markdown: string,
): Promise<void> {
  await callTool("edit_task_notes", { taskId, notes: markdown });
}

/** Set planned time in minutes for a task, or one of its subtasks. */
export async function setPlannedTime(
  taskId: string,
  minutes: number,
  subtaskId?: string,
): Promise<void> {
  const args: Record<string, unknown> = { taskId, timeEstimate: minutes };
  if (subtaskId) args.subtaskId = subtaskId;
  await callTool("edit_task_time_estimate", args);
}

/**
 * The requests that set a task's own planned time, in order. Sunsama derives
 * the task total from its subtasks whenever any of them carry an estimate, and
 * rejects a task-level estimate in that case, so those are cleared first.
 *
 * Returned as separate steps rather than run together: each is its own request
 * that persists on its own, and callers need to know how many landed if a
 * later one fails.
 */
export function plannedTimeSteps(
  taskId: string,
  minutes: number,
  subtaskIdsToClear: string[] = [],
): Array<() => Promise<void>> {
  return [
    ...subtaskIdsToClear.map((id) => () => setPlannedTime(taskId, 0, id)),
    () => setPlannedTime(taskId, minutes),
  ];
}

/** Subtask ids that carry their own planned time (these block a task-level estimate). */
export function subtasksWithPlannedTime(task: Task): string[] {
  return task.subtasks
    .filter((s) => (s.timeEstimate ?? 0) > 0)
    .map((s) => s.id);
}

/** Assign the task to a channel by name (closest match wins). */
export async function setChannel(
  taskId: string,
  channelName: string,
): Promise<void> {
  await callTool("add_task_to_channel", { taskId, channel: channelName });
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export async function startTimer(
  taskId: string,
  subtaskId?: string,
): Promise<void> {
  const args: Record<string, unknown> = { taskId };
  if (subtaskId) args.subtaskId = subtaskId;
  await callTool("start_task_timer", args);
}

export async function stopTimer(
  taskId: string,
  subtaskId?: string,
): Promise<void> {
  const args: Record<string, unknown> = { taskId };
  if (subtaskId) args.subtaskId = subtaskId;
  await callTool("stop_task_timer", args);
}

// ---------------------------------------------------------------------------
// Subtasks
// ---------------------------------------------------------------------------

export async function addSubtasks(
  taskId: string,
  subtasks: SubtaskInput[],
): Promise<void> {
  await callTool("add_subtasks_to_task", {
    taskId,
    subtasks: subtasks.map((s) => ({ title: s.title })),
  });
}

export async function editSubtaskTitle(
  taskId: string,
  subtaskId: string,
  title: string,
): Promise<void> {
  await callTool("edit_subtask_title", { taskId, subtaskId, newTitle: title });
}

export async function completeSubtask(
  taskId: string,
  subtaskId: string,
): Promise<void> {
  await callTool("mark_subtask_as_completed", { taskId, subtaskId });
}

export async function uncompleteSubtask(
  taskId: string,
  subtaskId: string,
): Promise<void> {
  await callTool("mark_subtask_as_incomplete", { taskId, subtaskId });
}
