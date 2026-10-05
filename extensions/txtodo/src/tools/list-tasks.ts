import { formatRelativeDue } from "../domain/due";
import type { Task } from "../domain/parser";
import { stripMetadataFromDescription } from "../domain/parser";
import { applyPreset, isValidPreset, type ViewPreset } from "../domain/preset";
import { matchesFilters, type TagFilter } from "../domain/tags";
import { read } from "../io/todoFile";
import { getPreferences } from "../preferences";

type Input = {
  preset?: string;
  project?: string;
  context?: string;
};

export default async function tool(input: Input): Promise<string> {
  const prefs = getPreferences();
  const snapshot = await read(prefs.todoPath);
  if (snapshot === "notfound") {
    return `todo.txt not found at ${prefs.todoPath} — create it via the Show Tasks command first.`;
  }

  const now = new Date();
  const preset: ViewPreset = isValidPreset(input.preset) ? input.preset : "all";
  let tasks = applyPreset(snapshot.tasks, preset, now);

  const filters: TagFilter[] = [];
  if (input.project) filters.push({ kind: "project", name: stripSigil(input.project, "+") });
  if (input.context) filters.push({ kind: "context", name: stripSigil(input.context, "@") });
  if (filters.length > 0) tasks = tasks.filter((t) => matchesFilters(t, filters));

  if (tasks.length === 0) return "No tasks match.";

  return tasks.map((t) => formatTaskLine(t, now)).join("\n");
}

function stripSigil(value: string, sigil: "+" | "@"): string {
  return value.startsWith(sigil) ? value.slice(1) : value;
}

function formatTaskLine(task: Task, now: Date): string {
  const lineNum = `[${task.lineNumber}]`;
  const prio = task.priority ? `(${task.priority}) ` : "    ";
  const desc = stripMetadataFromDescription(task.description);
  const due = formatRelativeDue(task.metadata.due, now);
  const dueSuffix = due ? ` — ${due}` : "";
  return `- ${lineNum} ${prio}${desc}${dueSuffix}`;
}
