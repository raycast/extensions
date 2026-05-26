import { type LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { resolveDueOption } from "./domain/due";
import type { Priority, Task } from "./domain/parser";
import { taskFromFields, withCreationDate } from "./domain/task";
import { type FileSnapshot, read, writeAtomic } from "./io/todoFile";
import { getPreferences } from "./preferences";

type Arguments = {
  description: string;
  priority?: string;
  due?: string;
};

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function QuickAdd(props: LaunchProps<{ arguments: Arguments }>) {
  const prefs = getPreferences();
  const args = props.arguments;

  const description = args.description.trim();
  if (!description) {
    await showHUD("⚠️ Empty task — nothing added");
    return;
  }

  const priority = args.priority && args.priority !== "none" ? (args.priority as Priority) : undefined;
  const due = args.due ? resolveDueOption(args.due, new Date()) : undefined;

  let task = taskFromFields({
    description,
    priority,
    projects: [],
    contexts: [],
    due,
  });
  if (prefs.autoStampCreationDate && !task.creationDate) {
    task = withCreationDate(task, today());
  }

  let current = await read(prefs.todoPath);
  if (current === "notfound") {
    await showToast({
      style: Toast.Style.Failure,
      title: "todo.txt not found",
      message: `Create it first at ${prefs.todoPath}`,
    });
    return;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await tryAppend(current, task);
    if (result.kind === "ok") {
      await showHUD(`✓ Added: ${task.description}`);
      return;
    }
    current = result.fresh;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Couldn't add task",
    message: "File kept changing — try again",
  });
}

async function tryAppend(snapshot: FileSnapshot, task: Task) {
  const next = [...snapshot.tasks, { ...task, lineNumber: snapshot.tasks.length }];
  return writeAtomic(snapshot, next);
}
