import type { Tool } from "@raycast/api";
import { bestMatch } from "../domain/fuzzyMatch";
import type { Task } from "../domain/parser";
import { complete } from "../domain/task";
import { appendToDone, read, writeAtomic } from "../io/todoFile";
import { getPreferences } from "../preferences";

type Input = {
  query: string;
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function tool(input: Input): Promise<string> {
  const prefs = getPreferences();
  let current = await read(prefs.todoPath);
  if (current === "notfound") {
    return `todo.txt not found at ${prefs.todoPath} — create it via the Show Tasks command first.`;
  }

  const active = current.tasks.filter((t) => !t.completed);
  const match = bestMatch(active, input.query);
  if (!match) return `No active task matched '${input.query}'.`;

  const completed = complete(match, todayISO());

  // When archiving, write to done.txt FIRST. If this fails, we abort
  // without touching todo.txt, so the task is never lost (only the UI's
  // toggleComplete and this tool need to enforce this ordering — the
  // append-then-remove sequence is the only safe one).
  if (prefs.archiveOnComplete) {
    try {
      await appendToDone(prefs.donePath, [completed]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `Couldn't archive to done.txt: ${message}`;
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const idx = current.tasks.findIndex((t) => t.raw === match.raw && t.lineNumber === match.lineNumber);
    if (idx === -1) {
      return prefs.archiveOnComplete
        ? `Completed: ${match.description} (already gone from todo.txt; appended to done.txt).`
        : `The matched task is no longer in todo.txt — already completed or deleted externally.`;
    }

    const next: Task[] = prefs.archiveOnComplete
      ? [...current.tasks.slice(0, idx), ...current.tasks.slice(idx + 1)]
      : [...current.tasks.slice(0, idx), completed, ...current.tasks.slice(idx + 1)];

    const result = await writeAtomic(current, next);
    if (result.kind === "ok") {
      return `Completed: ${match.description}`;
    }
    current = result.fresh;
  }

  return prefs.archiveOnComplete
    ? "Appended to done.txt but couldn't remove from todo.txt — file kept changing. Use Show Tasks to clean up."
    : "Couldn't apply change — the file kept changing. Try again.";
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
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
  return { message: `Complete: '${match.description}'?` };
};
