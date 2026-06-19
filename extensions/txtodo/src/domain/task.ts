import {
  extractTags,
  type Priority,
  serializeTask,
  stripMetadataFromDescription,
  stripTagsFromDescription,
  type Task,
} from "./parser";

function rebuild(task: Task): Task {
  return { ...task, raw: serializeTask(task) };
}

export function complete(task: Task, today: string): Task {
  if (task.completed) return task;
  // Per the todo.txt spec, completing a task removes its priority.
  return rebuild({ ...task, completed: true, completionDate: today, priority: undefined });
}

export function uncomplete(task: Task): Task {
  if (!task.completed) return task;
  return rebuild({ ...task, completed: false, completionDate: undefined });
}

const A = "A".charCodeAt(0);
const Z = "Z".charCodeAt(0);

export function setPriority(task: Task, prio: Priority | undefined): Task {
  return rebuild({ ...task, priority: prio });
}

export function bumpPriorityUp(task: Task): Task {
  if (!task.priority) return setPriority(task, "Z");
  const code = task.priority.charCodeAt(0);
  if (code <= A) return task;
  return setPriority(task, String.fromCharCode(code - 1) as Priority);
}

export function bumpPriorityDown(task: Task): Task {
  if (!task.priority) return task;
  const code = task.priority.charCodeAt(0);
  if (code >= Z) return setPriority(task, undefined);
  return setPriority(task, String.fromCharCode(code + 1) as Priority);
}

export function withCreationDate(task: Task, today: string): Task {
  if (task.creationDate) return task;
  return rebuild({ ...task, creationDate: today });
}

export type Fields = {
  description: string;
  priority?: Priority;
  projects: string[];
  contexts: string[];
  due?: string;
  creationDate?: string;
  completed?: boolean;
  completionDate?: string;
};

export function taskFromFields(fields: Fields): Task {
  const fromDescription = extractTags(fields.description);
  const cleanDescription = stripTagsFromDescription(fields.description);

  const projects = dedupe([...fields.projects, ...fromDescription.projects]);
  const contexts = dedupe([...fields.contexts, ...fromDescription.contexts]);

  const metadata: Record<string, string> = { ...fromDescription.metadata };
  if (fields.due !== undefined) metadata.due = fields.due;

  const descriptionWithTags = [
    cleanDescription,
    ...projects.map((p) => `+${p}`),
    ...contexts.map((c) => `@${c}`),
    ...Object.entries(metadata).map(([k, v]) => `${k}:${v}`),
  ]
    .filter((s) => s.length > 0)
    .join(" ");

  const task: Task = {
    raw: "",
    completed: fields.completed ?? false,
    completionDate: fields.completionDate,
    priority: fields.priority,
    creationDate: fields.creationDate,
    description: descriptionWithTags,
    projects,
    contexts,
    metadata,
    lineNumber: -1,
  };

  return { ...task, raw: serializeTask(task) };
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

export function setDue(task: Task, due: string | undefined): Task {
  // Build updated metadata: spread existing, override or omit `due`
  const metadata: Record<string, string> = { ...task.metadata };
  if (due) {
    metadata.due = due;
  } else {
    delete metadata.due;
  }
  // Rebuild description: strip all existing metadata tags, then re-append from metadata map
  const baseDescription = stripMetadataFromDescription(task.description);
  const metaTokens = Object.entries(metadata).map(([k, v]) => `${k}:${v}`);
  const description = [baseDescription, ...metaTokens].filter((s) => s.length > 0).join(" ");
  const next = { ...task, metadata, description };
  return { ...next, raw: serializeTask(next) };
}
