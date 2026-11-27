import { Form } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export type List = { list_id: string; collection_id: string; title: string };
export type SmartList = { smart_list_id: string; collection_id: string; title: string };
export type Tag = { tag_id: string; title: string };
export type Task = {
  task_id: string;
  title: string;
  notes: string;
  list_id: string;
  list_title: string;
  completed: boolean;
  completion_date?: string;
  starred: boolean;
  priority: "none" | "low" | "medium" | "high";
  start_date?: string;
  start_time?: string;
  due_date?: string;
  due_time?: string;
  tags: Tag[];
  task_type: "normal" | "project" | "checklist";
  recurrence?: RawRecurrence | null;
  action: { type: string; value?: string };
  presentation: {
    start_date_formatted?: string;
    due_date_formatted?: string;
    is_overdue: boolean;
  };
};

export type Recurrence = {
  frequency?: string;
  interval?: number;
  unit?: string;
  weekdays?: Weekday[];
  weekday?: Weekday;
  ordinal?: number | string;
  based_on?: string;
  end_rule?: { type?: string; occurrence_count?: number; date?: string };
};

// A recurrence as 2Do reports it: unchecked weekday names, and its misnamed keys ("wkdy" for the
// monthly weekday, "ldt " for the end date). recurrenceOf turns it into a Recurrence.
export type RawRecurrence = Omit<Recurrence, "weekdays" | "weekday" | "end_rule"> & {
  weekdays?: string[];
  weekday?: string;
  wkdy?: string;
  end_rule?: Recurrence["end_rule"] & { "ldt "?: string };
};

export type TaskValues = {
  title: string;
  notes: string;
  list_id: string;
  start: Date | null;
  due: Date | null;
  priority: string;
  starred: boolean;
  tag_ids: string[];
  // Comma-separated tag names, for tags not in 2Do yet. Names matching an existing tag use that tag.
  new_tags?: string;
  // Undefined when the form leaves the task's action alone (a type missing from ACTIONS).
  action_type?: string;
  action_value?: string;
  // A project or checklist in the list to put the task in, or "" for the list itself.
  parent_id?: string;
  // New tasks only: "normal", "project", or "checklist". A project or checklist goes in the list,
  // never in another one.
  task_type?: string;
  // The Repeat checkbox. When it's off, saving clears the repeat.
  is_repeating?: boolean;
  // A REPEATS frequency. Undefined when the form leaves the repeat alone (one it can't show).
  repeat?: string;
  repeat_interval?: string;
  repeat_unit?: string;
  repeat_days?: string[];
  // Monthly: "" for the same day of the month, or "1"–"5" or "-1" (last) with repeat_weekday.
  repeat_ordinal?: string;
  repeat_weekday?: string;
  repeat_from?: string;
  repeat_end?: string;
  repeat_count?: string;
  repeat_until?: Date | null;
};

export const REPEATS = ["daily", "weekdays", "weekly", "monthly", "yearly", "custom"];
export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
const isWeekday = (d?: string): d is Weekday => WEEKDAYS.includes(d as Weekday);
const UNITS = ["day", "week", "month", "year"];

// 2Do's limits for a repeat's numbers. Undefined when the value is fine or not used.
export function repeatValueError(field: "interval" | "count", value?: string) {
  const n = Number(value);
  const max = field === "interval" ? 999 : 99;
  if (!(Number.isInteger(n) && n >= 1 && n <= max)) return `Enter a whole number from 1 to ${max}`;
}

// A task's recurrence with 2Do's misnamed keys read and its weekdays narrowed to WEEKDAYS. A weekday
// name 2Do reports that isn't in WEEKDAYS is dropped.
export function recurrenceOf(task: Task): Recurrence | undefined {
  const r = task.recurrence;
  if (!r) return;
  const { weekdays, weekday, wkdy, end_rule: end, ...rest } = r;
  const day = weekday ?? wkdy;
  return {
    ...rest,
    ...(weekdays && { weekdays: weekdays.filter(isWeekday) }),
    ...(isWeekday(day) && { weekday: day }),
    ...(end && { end_rule: { ...end, date: end.date ?? end["ldt "] } }),
  };
}

// The recurrence to send for the form's repeat fields, or { frequency: "none" } to clear it.
export function recurrenceArgs(v: Partial<TaskValues>): Recurrence {
  if (!v.is_repeating || !v.repeat || v.repeat === "none") return { frequency: "none" };
  const days = WEEKDAYS.filter((d) => v.repeat_days?.includes(d));
  return {
    frequency: v.repeat,
    based_on: v.repeat_from || "due_date",
    ...(v.repeat === "custom" && { interval: Number(v.repeat_interval), unit: v.repeat_unit || "day" }),
    ...(v.repeat === "weekly" && days.length > 0 && { weekdays: days }),
    ...(v.repeat === "monthly" &&
      v.repeat_ordinal && {
        weekday: isWeekday(v.repeat_weekday) ? v.repeat_weekday : "monday",
        ordinal: Number(v.repeat_ordinal),
      }),
    end_rule:
      v.repeat_end === "after_count"
        ? { type: "after_count", occurrence_count: Number(v.repeat_count) }
        : v.repeat_end === "on_date" && v.repeat_until
          ? { type: "on_date", date: ymd(v.repeat_until) }
          : { type: "never" },
  };
}

// The form's repeat fields for a task, with defaults for the fields its repeat doesn't use. A repeat
// the form can't show leaves `repeat` undefined, so saving leaves it alone.
export function repeatValues(task?: Task) {
  const r = task && recurrenceOf(task);
  const known =
    !r?.frequency ||
    r.frequency === "none" ||
    (REPEATS.includes(r.frequency) &&
      (!r.unit || UNITS.includes(r.unit)) &&
      ["never", "after_count", "on_date"].includes(r.end_rule?.type ?? "never"));
  const on = !!r?.frequency && r.frequency !== "none";
  return {
    is_repeating: on,
    repeat: known ? (on ? r.frequency : "daily") : undefined,
    repeat_interval: String(r?.interval ?? 2),
    repeat_unit: r?.unit ?? "day",
    repeat_days: r?.weekdays ?? [],
    repeat_ordinal: r?.ordinal !== undefined && r.weekday ? String(r.ordinal) : "",
    repeat_weekday: r?.weekday ?? "monday",
    repeat_from: r?.based_on ?? "due_date",
    repeat_end: r?.end_rule?.type ?? "never",
    repeat_count: String(r?.end_rule?.occurrence_count ?? ""),
    repeat_until: r?.end_rule?.date ? toDate(r.end_rule.date) : null,
  };
}

// 2Do's task action types besides "none", with how the form asks for each one's value.
export const ACTIONS: Record<string, { title: string; label: string; placeholder: string }> = {
  url: { title: "Link", label: "URL", placeholder: "https://" },
  call: { title: "Call", label: "Phone Number", placeholder: "+1 555 0100" },
  message: { title: "Message", label: "Phone Number", placeholder: "+1 555 0100" },
  mail: { title: "Email", label: "Email Address", placeholder: "name@example.com" },
  visit: { title: "Visit", label: "Address", placeholder: "1 Infinite Loop, Cupertino" },
  google: { title: "Google", label: "Search Terms", placeholder: "Search Google" },
};

export function actionValueError(type?: string, value?: string) {
  if (!type || type === "none") return;
  if (!value?.trim()) return "Required";
  if (type === "url" && !(/^[a-z][\w+.-]*:\/\//i.test(value) && URL.canParse(value)))
    return "Enter a full link, like https://example.com";
}

// The URL that runs a task's action, e.g. tel: for a call. Undefined for no action or an unknown type.
export function actionURL({ type, value = "" }: Task["action"]) {
  const phone = value.replace(/[^\d+*#]/g, "");
  const query = encodeURIComponent(value);
  if (type === "url") return value;
  if (type === "call") return `tel:${phone}`;
  if (type === "message") return `sms:${phone}`;
  if (type === "mail") return `mailto:${value}`;
  if (type === "visit") return `maps://?q=${query}`;
  if (type === "google") return `https://www.google.com/search?q=${query}`;
}

// Calls a command from 2Do's AppleScript "Automation Suite" (same commands and arguments as 2Do's MCP server).
// 2Do errors are thrown as script errors, e.g. "not_found: Task 'x' was not found."
export async function twoDo<T>(command: string, args: object = {}): Promise<T> {
  let out: string;
  try {
    out = await runAppleScript(
      `function run(argv) { return JSON.stringify(Application("2Do")[argv[0]]({ arguments: JSON.parse(argv[1]) })); }`,
      [command, JSON.stringify(args)],
      { language: "JavaScript" },
    );
  } catch (error) {
    throw friendlyError(error);
  }
  return JSON.parse(out);
}

// AppleScript's errors for a 2Do without the Automation Suite (-1708) or no 2Do at all (-2700),
// reworded to say what to do. Other errors, like 2Do's own "not_found: …", pass through.
export function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Message not understood|-1708/.test(message))
    return new Error(
      "This 2Do version doesn't have the automation this extension uses. Update 2Do to the latest version, then try again.",
    );
  if (/Application can.t be found|-2700|-10814/.test(message))
    return new Error("2Do isn't installed. Install 2Do for Mac, then try again.");
  return error;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Local "yyyy-MM-dd".
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// 2Do takes floating local "yyyy-MM-dd" dates and optional "HH:mm" times. null clears (edit only).
export function dateFields(prefix: "start" | "due", d: Date | null, clear: boolean) {
  const empty = clear ? { [`${prefix}_date`]: null, [`${prefix}_time`]: null } : {};
  if (!d) return empty;
  return {
    ...empty,
    [`${prefix}_date`]: ymd(d),
    ...(!Form.DatePicker.isFullDay(d) && { [`${prefix}_time`]: `${pad(d.getHours())}:${pad(d.getMinutes())}` }),
  };
}

export function toDate(date?: string, time?: string) {
  if (!date) return null;
  if (time) return new Date(`${date}T${time}`);
  // Raycast marks a full-day date (no time) with 1 millisecond; see Form.DatePicker.isFullDay in Raycast's runtime.
  return new Date(`${date}T00:00:00.001`);
}

// Local "yyyy-MM-dd" for the day after `now`.
export function ymdTomorrow(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return ymd(d);
}

// Splits Today into Now and Later Today: a task has started unless it has a start time still ahead.
export function hasStarted(task: Task, now = new Date()) {
  if (!task.start_time) return true;
  const start = toDate(task.start_date, task.start_time);
  return !start || start <= now;
}

// Sort key: start date/time if present, else due. Timed before full-day on the same day (`~` after times).
function datedSortKey(task: Task) {
  if (task.start_date) return `${task.start_date} ${task.start_time ?? "~"}`;
  if (task.due_date) return `${task.due_date} ${task.due_time ?? "~"}`;
  return null;
}

// Dated scopes: start ascending, falling back to due per task; undated last; ties by task_id.
export function sortByStartThenDue(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => compareKeys(datedSortKey(a), datedSortKey(b), a, b));
}

// Deadlines: Overdue then Upcoming, each by due date ascending (timed before full-day).
export function deadlineSections(tasks: Task[]): [string, Task[]][] {
  const sorted = sortByDueDate(tasks);
  return [
    ["Overdue", sorted.filter((t) => t.presentation.is_overdue)],
    ["Upcoming", sorted.filter((t) => !t.presentation.is_overdue)],
  ];
}

function compareKeys(ka: string | null, kb: string | null, a: Task, b: Task, descending = false) {
  if (ka === null && kb === null) return a.task_id < b.task_id ? -1 : a.task_id > b.task_id ? 1 : 0;
  if (ka === null) return 1;
  if (kb === null) return -1;
  if (ka < kb) return descending ? 1 : -1;
  if (ka > kb) return descending ? -1 : 1;
  return a.task_id < b.task_id ? -1 : a.task_id > b.task_id ? 1 : 0;
}

// Due date ascending; timed before full-day; undated last.
export function sortByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ka = a.due_date ? `${a.due_date} ${a.due_time ?? "~"}` : null;
    const kb = b.due_date ? `${b.due_date} ${b.due_time ?? "~"}` : null;
    return compareKeys(ka, kb, a, b);
  });
}

// Done: newest completions first; missing completion_date last.
export function sortByCompletionDateDesc(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ka = a.completion_date ?? null;
    const kb = b.completion_date ?? null;
    return compareKeys(ka, kb, a, b, true);
  });
}

// Tag picker choices: all tags plus the task's own. 2Do can leave a task's tag out of list_tags,
// and a picker value with no matching item is dropped on save, which would remove the tag.
export function tagOptions(tags: Tag[] = [], task?: Task): Tag[] {
  const known = new Set(tags.map((t) => t.tag_id));
  return [...tags, ...(task?.tags ?? []).filter((t) => !known.has(t.tag_id))];
}

export function taskToValues(task: Task): TaskValues {
  return {
    title: task.title,
    notes: task.notes,
    list_id: task.list_id,
    start: toDate(task.start_date, task.start_time),
    due: toDate(task.due_date, task.due_time),
    priority: task.priority,
    starred: task.starred,
    tag_ids: task.tags.map((t) => t.tag_id),
    action_type: task.action.type === "none" || task.action.type in ACTIONS ? task.action.type : undefined,
    action_value: task.action.value ?? "",
    parent_id: "",
    ...repeatValues(task),
  };
}

// Default values for a new task. `listId` is omitted on initial render so the List dropdown's
// `storeValue` restores the last-used list; resetting after saving passes the chosen list to keep it.
export function newTaskValues(listId?: string): Partial<TaskValues> {
  return {
    title: "",
    notes: "",
    ...(listId && { list_id: listId }),
    start: null,
    due: null,
    priority: "none",
    starred: false,
    tag_ids: [],
    new_tags: "",
    action_type: "none",
    action_value: "",
    parent_id: "",
    task_type: "normal",
    ...repeatValues(),
  };
}

// The task's links: its link action first, then URLs in the notes, without duplicates.
export function taskLinks(task: Task): string[] {
  const inNotes = (task.notes.match(/\b[a-z][\w+.-]*:\/\/[^\s<>"]+/gi) ?? []).map((u) => {
    u = u.replace(/[.,;:!?]+$/, "");
    return u.endsWith(")") && !u.includes("(") ? u.slice(0, -1) : u;
  });
  const link = task.action.type === "url" ? task.action.value : undefined;
  return [...new Set([link, ...inNotes].filter((u): u is string => !!u))];
}

// Creates a task, or updates `task` (moving it if the list changed). With `parent_id`, the task goes
// into that project or checklist instead: 2Do takes exactly one destination, list or parent.
// `parentId` is the project or checklist an edited task is already in, if any.
export async function saveTask(v: TaskValues, task?: Task, parentId?: string) {
  // 2Do can't repeat a task without dates, so a repeating task with neither date starts today.
  const repeats = !!v.is_repeating && !!v.repeat;
  const start = repeats && !v.start && !v.due ? toDate(ymd(new Date())) : v.start;
  const fields = {
    title: v.title,
    priority: v.priority,
    starred: v.starred,
    ...dateFields("start", start, !!task),
    ...dateFields("due", v.due, !!task),
  };
  const tagUpdate = await tagUpdateFor(v, task);
  // 2Do rejects a value on "none" and requires one on every other type.
  const action =
    !v.action_type || v.action_type === "none"
      ? { type: "none" }
      : { type: v.action_type, value: v.action_value?.trim() };
  if (!task) {
    const nests = v.parent_id && (!v.task_type || v.task_type === "normal");
    await twoDo("create_task", {
      ...fields,
      ...(nests ? { parent_task_id: v.parent_id } : { list_id: v.list_id }),
      ...(v.task_type && v.task_type !== "normal" && { task_type: v.task_type }),
      notes: v.notes || undefined,
      ...((tagUpdate.tag_ids.length > 0 || tagUpdate.tag_names) && { tag_update: tagUpdate }),
      ...(action.type !== "none" && { action }),
      ...(repeats && { recurrence: recurrenceArgs(v) }),
    });
    return;
  }
  // Sent only when changed, so an untouched repeat stays exactly as 2Do has it.
  const recurrence = recurrenceArgs(v);
  const repeatChanged =
    v.repeat !== undefined && JSON.stringify(recurrence) !== JSON.stringify(recurrenceArgs(repeatValues(task)));
  await twoDo("update_task", {
    ...fields,
    task_id: task.task_id,
    notes: v.notes,
    tag_update: tagUpdate,
    ...(v.action_type !== undefined &&
      (action.type !== task.action.type || action.value !== task.action.value) && { action }),
    ...(repeatChanged && { recurrence }),
  });
  if (v.parent_id) {
    if (v.parent_id !== parentId) await twoDo("move_task", { task_id: task.task_id, parent_task_id: v.parent_id });
  } else if (parentId || v.list_id !== task.list_id)
    await twoDo("move_task", { task_id: task.task_id, list_id: v.list_id });
}

// Projects and checklists in a list, which a task can be put in. 2Do turns a project or checklist
// put inside another into a normal task, so only normal tasks are offered this.
export async function listParents(listId: string) {
  const { tasks } = await twoDo<{ tasks: Task[] }>("query_tasks", { list_id: listId, include_completed: false });
  return tasks.filter((t) => t.task_type !== "normal");
}

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// The New Tags field's names, trimmed, without blanks or repeats.
export function tagNames(text = "") {
  const names = text
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  return names.filter((n, i) => names.findIndex((m) => sameTitle(m, n)) === i);
}

// The tag_update for the picked tags plus the New Tags names. A name matching an existing tag
// (case-insensitively) adds that tag's ID, so only names with no tag yet go to 2Do to be created.
// tag_names only works with "set", and tag_ids is required even when empty.
async function tagUpdateFor(
  v: TaskValues,
  task?: Task,
): Promise<{ operation: "set"; tag_ids: string[]; tag_names?: string[] }> {
  const names = tagNames(v.new_tags);
  if (names.length === 0) return { operation: "set", tag_ids: v.tag_ids };
  const { tags } = await twoDo<{ tags: Tag[] }>("list_tags");
  const known = tagOptions(tags, task);
  const ids = new Set(v.tag_ids);
  const missing: string[] = [];
  for (const name of names) {
    const tag = known.find((t) => sameTitle(t.title, name));
    if (tag) ids.add(tag.tag_id);
    else missing.push(name);
  }
  return { operation: "set", tag_ids: [...ids], ...(missing.length > 0 && { tag_names: missing }) };
}

export const isRepeating = (task: Task) => !!task.recurrence?.frequency && task.recurrence.frequency !== "none";

const day3 = (d: string) => d.slice(0, 1).toUpperCase() + d.slice(1, 3);
const ordinal = (n: number | string) => {
  const v = Number(n);
  if (!Number.isInteger(v)) return String(n);
  if (v === -1) return "last";
  const teen = v % 100 >= 11 && v % 100 <= 13;
  return `${v}${teen ? "th" : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[v % 10] ?? "th")}`;
};

// A repeating task's rule in words, like "Every 3 days" or "Weekly on Mon, Tue, after completion".
export function repeatRule(task: Task) {
  const r = recurrenceOf(task);
  if (!r || !isRepeating(task)) return;
  const base: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
  let rule =
    r.frequency === "custom" && r.interval
      ? `Every ${r.interval === 1 ? "" : `${r.interval} `}${r.unit ?? "day"}${r.interval === 1 ? "" : "s"}`
      : r.frequency === "weekdays"
        ? "On weekdays"
        : (base[r.frequency!] ?? r.frequency!.slice(0, 1).toUpperCase() + r.frequency!.slice(1));
  if (r.weekdays?.length) rule += ` on ${r.weekdays.map(day3).join(", ")}`;
  else if (r.weekday && r.ordinal !== undefined) rule += ` on the ${ordinal(r.ordinal)} ${day3(r.weekday)}`;
  if (r.based_on === "completion") rule += ", after completion";
  if (r.end_rule?.type === "after_count" && r.end_rule.occurrence_count)
    rule += `, ${r.end_rule.occurrence_count} times`;
  if (r.end_rule?.type === "on_date" && r.end_rule.date) rule += `, until ${r.end_rule.date}`;
  return rule;
}

export type CancelPrefs = {
  cancelBehavior: "complete-and-tag" | "tag" | "move" | "delete";
  cancelTag: string;
  cancelList: string;
};

export async function findTag(title: string) {
  const { tags } = await twoDo<{ tags: Tag[] }>("list_tags");
  return tags.find((t) => sameTitle(t.title, title));
}

// Tags named in preferences are never created, so a missing one is an error saying how to fix it.
export async function requireTag(title: string, fix: string): Promise<Tag> {
  const tag = await findTag(title);
  if (!tag) throw new Error(`No 2Do tag named "${title.trim()}". ${fix}`);
  return tag;
}

// Completes `task` and returns the ID of the completed occurrence. For a repeating task, 2Do keeps the
// open task (moved to its next date) and adds a completed copy, which only a search by title finds.
// 2Do's search finds nothing without a list to search in, so it searches the task's list.
async function completeOccurrence(task: Task) {
  const { task: after } = await twoDo<{ task: Task }>("complete_task", { task_id: task.task_id });
  if (after.completed) return after.task_id;
  const { tasks } = await twoDo<{ tasks: Task[] }>("query_tasks", {
    list_id: task.list_id,
    search: task.title,
    include_completed: true,
    paused_filter: "include",
  });
  const [copy] = tasks
    .filter((t) => t.completed && t.title === task.title && t.task_id !== task.task_id)
    .sort((a, b) => (b.completion_date ?? "").localeCompare(a.completion_date ?? ""));
  if (!copy)
    throw new Error("Completed this occurrence, but couldn't find it to finish cancelling. Check 2Do's Done view.");
  return copy.task_id;
}

// 2Do's own convention is a completed task carrying a "Cancelled" tag. The task is completed first,
// then only the completed occurrence is tagged, moved, or deleted, so a repeating task's next
// occurrence stays untouched. The tag or list isn't created, so a missing one is an error naming
// the preference, raised before anything changes.
export async function cancelTask(task: Task, p: CancelPrefs) {
  const needsTag = p.cancelBehavior === "complete-and-tag" || p.cancelBehavior === "tag";
  const tag = needsTag
    ? await requireTag(
        p.cancelTag,
        "Add it in 2Do, or set Cancel Tag in the extension's settings to the tag you use for cancelled tasks.",
      )
    : undefined;
  let target: List | undefined;
  if (p.cancelBehavior === "move") {
    if (!p.cancelList.trim()) throw new Error("Set the Cancel List preference to the list cancelled tasks move to.");
    const { list } = await twoDo<{ list: List[] }>("list_lists");
    target = list.find((l) => sameTitle(l.title, p.cancelList));
    if (!target) throw new Error(`No 2Do list named "${p.cancelList}". Check the Cancel List preference.`);
  }
  if (p.cancelBehavior === "delete" && !isRepeating(task)) {
    await twoDo("delete_task", { task_id: task.task_id });
    return;
  }
  const taskId = p.cancelBehavior === "tag" ? task.task_id : await completeOccurrence(task);
  if (tag) await twoDo("update_task", { task_id: taskId, tag_update: { operation: "append", tag_ids: [tag.tag_id] } });
  if (target) await twoDo("move_task", { task_id: taskId, list_id: target.list_id });
  if (p.cancelBehavior === "delete") await twoDo("delete_task", { task_id: taskId });
}

// Completes a project or checklist. 2Do completes its open items along with it; with `cancelItems`,
// they're cancelled first, each per the Cancel Task preferences.
export async function completeParent(parent: Task, cancelItems: boolean, p: CancelPrefs) {
  if (cancelItems) {
    const { tasks } = await twoDo<{ tasks: Task[] }>("list_subtasks", { task_id: parent.task_id });
    for (const item of tasks.filter((t) => !t.completed)) await cancelTask(item, p);
  }
  await twoDo("complete_task", { task_id: parent.task_id });
}

export function isCancelled(task: Task, p: CancelPrefs) {
  return task.completed && (task.tags.some((t) => sameTitle(t.title, p.cancelTag)) || inCancelList(task, p));
}

// A completed task in the Cancel List was cancelled by moving it there.
export function inCancelList(task: Task, p: CancelPrefs) {
  return (
    task.completed && p.cancelBehavior === "move" && !!p.cancelList.trim() && sameTitle(task.list_title, p.cancelList)
  );
}

// Marks a completed task not done, undoing a cancel: the cancel tag comes off, and with `listId`, the
// task moves there (out of the Cancel List, since where it came from isn't recorded).
export async function reopenTask(task: Task, p: CancelPrefs, listId?: string) {
  await twoDo("uncomplete_task", { task_id: task.task_id });
  await clearCancelMark(task, p, listId);
}

// On an already-completed task, apply the cancel mark (tag or Cancel List) without completing again.
// Delete has no mark to apply — callers hide Mark as Cancelled Instead for that preference.
export async function applyCancelMark(task: Task, p: CancelPrefs) {
  if (p.cancelBehavior === "delete") {
    throw new Error(
      "Cancel Task is set to Delete, which has no cancelled mark. Change the preference, or delete the task from 2Do.",
    );
  }
  if (p.cancelBehavior === "complete-and-tag" || p.cancelBehavior === "tag") {
    const tag = await requireTag(
      p.cancelTag,
      "Add it in 2Do, or set Cancel Tag in the extension's settings to the tag you use for cancelled tasks.",
    );
    await twoDo("update_task", { task_id: task.task_id, tag_update: { operation: "append", tag_ids: [tag.tag_id] } });
    return;
  }
  if (!p.cancelList.trim()) throw new Error("Set the Cancel List preference to the list cancelled tasks move to.");
  const { list } = await twoDo<{ list: List[] }>("list_lists");
  const target = list.find((l) => sameTitle(l.title, p.cancelList));
  if (!target) throw new Error(`No 2Do list named "${p.cancelList}". Check the Cancel List preference.`);
  if (target.list_id !== task.list_id) await twoDo("move_task", { task_id: task.task_id, list_id: target.list_id });
}

// Strip the cancel mark from a completed task, leaving it completed. With `listId`, move it there
// (out of the Cancel List).
export async function clearCancelMark(task: Task, p: CancelPrefs, listId?: string) {
  const tag = task.tags.find((t) => sameTitle(t.title, p.cancelTag));
  if (tag)
    await twoDo("update_task", { task_id: task.task_id, tag_update: { operation: "remove", tag_ids: [tag.tag_id] } });
  if (listId && listId !== task.list_id) await twoDo("move_task", { task_id: task.task_id, list_id: listId });
}

// Scope values are 2Do collection ids ("list:<id>", "smart-list:<id>"), "paused-tag:<id>", or "focus:<name>".
export function scopeArgs(scope: string) {
  const [kind, id] = scope.split(":");
  if (kind === "list") return { list_id: id, include_completed: false };
  if (kind === "smart-list") return { smart_list_id: id, include_completed: false };
  if (kind === "paused-tag") return { focus: "all", include_completed: false, paused_filter: "only" as const };
  if (kind === "focus" && id === "tomorrow") {
    const day = ymdTomorrow();
    return {
      focus: "all",
      include_completed: false,
      start_on_or_after: day,
      start_on_or_before: day,
    };
  }
  if (kind === "focus" && id === "deadlines")
    return { focus: "all", include_completed: false, due_on_or_before: "9999-12-31" };
  // Now and Later Today query Today's focus; the UI splits with hasStarted.
  if (kind === "focus" && (id === "now" || id === "later-today")) return { focus: "today", include_completed: false };
  return { focus: id, include_completed: id === "done" };
}
