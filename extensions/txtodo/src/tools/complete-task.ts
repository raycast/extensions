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

  for (let attempt = 0; attempt < 3; attempt++) {
    const active = current.tasks.filter((t) => !t.completed);
    const match = bestMatch(active, input.query);
    if (!match) return `No active task matched '${input.query}'.`;

    const completed = complete(match, todayISO());
    const idx = current.tasks.findIndex(
      (t) => t.raw === match.raw && t.lineNumber === match.lineNumber,
    );
    if (idx === -1) return `Couldn't locate the matched task in the file — please retry.`;

    const next: Task[] = prefs.archiveOnComplete
      ? [...current.tasks.slice(0, idx), ...current.tasks.slice(idx + 1)]
      : [...current.tasks.slice(0, idx), completed, ...current.tasks.slice(idx + 1)];

    const result = await writeAtomic(current, next);
    if (result.kind === "ok") {
      if (prefs.archiveOnComplete) {
        await appendToDone(prefs.donePath, [completed]);
      }
      return `Completed: ${match.description}`;
    }
    current = result.fresh;
  }

  return "Couldn't apply change — the file kept changing. Try again.";
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
