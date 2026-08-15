import type { Tool } from "@raycast/api";
import type { Priority, Task } from "../domain/parser";
import { serializeTask } from "../domain/parser";
import { taskFromFields, withCreationDate } from "../domain/task";
import { read, writeAtomic } from "../io/todoFile";
import { getPreferences } from "../preferences";

type Input = {
  description: string;
  priority?: string;
  due?: string;
};

const PRIORITY_RE = /^[A-Za-z]$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Built = { ok: true; task: Task } | { ok: false; error: string };

function buildTask(input: Input, prefs: Preferences): Built {
  if (input.description.trim() === "") {
    return { ok: false, error: "Empty description — nothing to add." };
  }
  if (input.priority !== undefined && !PRIORITY_RE.test(input.priority)) {
    return {
      ok: false,
      error: `Invalid priority '${input.priority}' — must be a single letter A-Z.`,
    };
  }
  if (input.due !== undefined && !DATE_RE.test(input.due)) {
    return { ok: false, error: `Invalid due date '${input.due}' — must be YYYY-MM-DD.` };
  }
  const priority = input.priority ? (input.priority.toUpperCase() as Priority) : undefined;
  let task = taskFromFields({
    description: input.description,
    priority,
    projects: [],
    contexts: [],
    due: input.due,
  });
  if (prefs.autoStampCreationDate && !task.creationDate) {
    task = withCreationDate(task, todayISO());
  }
  return { ok: true, task };
}

export default async function tool(input: Input): Promise<string> {
  const prefs = getPreferences();
  const built = buildTask(input, prefs);
  if (!built.ok) return built.error;

  let current = await read(prefs.todoPath);
  if (current === "notfound") {
    return `todo.txt not found at ${prefs.todoPath} — create it via the Show Tasks command first.`;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const next: Task[] = [...current.tasks, { ...built.task, lineNumber: current.tasks.length }];
    const result = await writeAtomic(current, next);
    if (result.kind === "ok") {
      return `Added: ${serializeTask(built.task)}`;
    }
    current = result.fresh;
  }

  return "Couldn't apply change — the file kept changing. Try again.";
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const prefs = getPreferences();
  const built = buildTask(input, prefs);
  if (!built.ok) return { message: built.error };
  return { message: `Add: '${serializeTask(built.task)}'?` };
};
