import type { Tool } from "@raycast/api";
import { bestMatch } from "../domain/fuzzyMatch";
import type { Task } from "../domain/parser";
import { setDue } from "../domain/task";
import { read, writeAtomic } from "../io/todoFile";
import { getPreferences } from "../preferences";

type Input = {
  query: string;
  due: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function tool(input: Input): Promise<string> {
  if (!DATE_RE.test(input.due)) {
    return `Invalid due date '${input.due}' — must be YYYY-MM-DD.`;
  }

  const prefs = getPreferences();
  let current = await read(prefs.todoPath);
  if (current === "notfound") {
    return `todo.txt not found at ${prefs.todoPath} — create it via the Show Tasks command first.`;
  }

  const active = current.tasks.filter((t) => !t.completed);
  const match = bestMatch(active, input.query);
  if (!match) return `No active task matched '${input.query}'.`;

  if (match.metadata.due === input.due) {
    return `'${match.description}' is already due ${input.due}.`;
  }

  const rescheduled = setDue(match, input.due);
  const previous = match.metadata.due ?? "no date";

  for (let attempt = 0; attempt < 3; attempt++) {
    const idx = current.tasks.findIndex((t) => t.raw === match.raw && t.lineNumber === match.lineNumber);
    if (idx === -1) {
      return `The matched task is no longer in todo.txt — it may have changed externally. Re-run the command to match against the current file.`;
    }

    const next: Task[] = [...current.tasks.slice(0, idx), rescheduled, ...current.tasks.slice(idx + 1)];
    const result = await writeAtomic(current, next);
    if (result.kind === "ok") {
      return `Rescheduled '${match.description}' from ${previous} to ${input.due}.`;
    }
    current = result.fresh;
  }

  return "Couldn't apply change — the file kept changing. Try again.";
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!DATE_RE.test(input.due)) {
    return { message: `Invalid due date '${input.due}' — must be YYYY-MM-DD.` };
  }

  const prefs = getPreferences();
  const snapshot = await read(prefs.todoPath);
  if (snapshot === "notfound") {
    return { message: `todo.txt not found at ${prefs.todoPath}.` };
  }
  const match = bestMatch(
    snapshot.tasks.filter((t) => !t.completed),
    input.query,
  );
  if (!match) return { message: `No active task matched '${input.query}'.` };

  if (match.metadata.due === input.due) {
    return { message: `'${match.description}' is already due ${input.due}.` };
  }

  const previous = match.metadata.due ?? "no date";
  return { message: `Reschedule '${match.description}' from ${previous} to ${input.due}?` };
};
