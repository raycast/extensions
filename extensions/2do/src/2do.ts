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
  starred: boolean;
  priority: "none" | "low" | "medium" | "high";
  start_date?: string;
  start_time?: string;
  due_date?: string;
  due_time?: string;
  tags: Tag[];
  presentation: { due_date_formatted?: string; is_overdue: boolean };
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
};

// Calls a command from 2Do's AppleScript "Automation Suite" (same commands and arguments as 2Do's MCP server).
// 2Do errors are thrown as script errors, e.g. "not_found: Task 'x' was not found."
export async function twoDo<T>(command: string, args: object = {}): Promise<T> {
  const out = await runAppleScript(
    `function run(argv) { return JSON.stringify(Application("2Do")[argv[0]]({ arguments: JSON.parse(argv[1]) })); }`,
    [command, JSON.stringify(args)],
    { language: "JavaScript" },
  );
  return JSON.parse(out);
}

const pad = (n: number) => String(n).padStart(2, "0");

// 2Do takes floating local "yyyy-MM-dd" dates and optional "HH:mm" times. null clears (edit only).
export function dateFields(prefix: "start" | "due", d: Date | null, clear: boolean) {
  const empty = clear ? { [`${prefix}_date`]: null, [`${prefix}_time`]: null } : {};
  if (!d) return empty;
  // ponytail: midnight counts as "no time" so untimed 2Do dates round-trip; a task timed at exactly 00:00 loses its time
  const fullDay = Form.DatePicker.isFullDay(d) || (d.getHours() === 0 && d.getMinutes() === 0);
  return {
    ...empty,
    [`${prefix}_date`]: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    ...(!fullDay && { [`${prefix}_time`]: `${pad(d.getHours())}:${pad(d.getMinutes())}` }),
  };
}

export function toDate(date?: string, time?: string) {
  return date ? new Date(`${date}T${time ?? "00:00"}`) : null;
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
  };
}

// Creates a task, or updates `task` (moving it if the list changed).
export async function saveTask(v: TaskValues, task?: Task) {
  const fields = {
    title: v.title,
    priority: v.priority,
    starred: v.starred,
    ...dateFields("start", v.start, !!task),
    ...dateFields("due", v.due, !!task),
  };
  if (!task) {
    await twoDo("create_task", {
      ...fields,
      list_id: v.list_id,
      notes: v.notes || undefined,
      ...(v.tag_ids.length > 0 && { tag_update: { operation: "set", tag_ids: v.tag_ids } }),
    });
    return;
  }
  await twoDo("update_task", {
    ...fields,
    task_id: task.task_id,
    notes: v.notes,
    tag_update: { operation: "set", tag_ids: v.tag_ids },
  });
  if (v.list_id !== task.list_id) await twoDo("move_task", { task_id: task.task_id, list_id: v.list_id });
}

// Scope values are 2Do collection ids ("list:<id>", "smart-list:<id>") or "focus:<name>".
export function scopeArgs(scope: string) {
  const [kind, id] = scope.split(":");
  if (kind === "list") return { list_id: id, include_completed: false };
  if (kind === "smart-list") return { smart_list_id: id, include_completed: false };
  return { focus: id, include_completed: id === "done" };
}
