import { readFile, writeFile, access, appendFile, stat } from "fs/promises";
import { dirname, join, resolve } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";
import type { TodoItem, SortOrder } from "./types";
import { cacheTodos } from "./cache";

// ---------------------------------------------------------------------------
// Path utilities
// ---------------------------------------------------------------------------

export function expandPath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return resolve(homedir(), filePath.slice(2));
  }
  return resolve(filePath);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that the configured file paths are usable.
 * Returns an error message string if something is wrong, or null if all good.
 *
 * Checks:
 * - todoFilePath must not point to a directory
 * - todoFilePath parent directory must exist and be writable
 * - doneFilePath (if set) parent directory must exist
 */
export async function validatePaths(
  todoFilePath: string,
  doneFilePath: string | undefined,
): Promise<string | null> {
  const todoPath = expandPath(todoFilePath);
  const todoDir = dirname(todoPath);

  // Check todo.txt parent directory exists
  try {
    const dirStat = await stat(todoDir);
    if (!dirStat.isDirectory()) {
      return `The folder for your todo.txt file does not exist: ${todoDir}`;
    }
  } catch {
    return `The folder for your todo.txt file does not exist: ${todoDir}`;
  }

  // Check todo.txt path is not itself a directory
  try {
    const fileStat = await stat(todoPath);
    if (fileStat.isDirectory()) {
      return `Your todo.txt path points to a folder, not a file: ${todoPath}`;
    }
  } catch {
    // File doesn't exist yet — that's fine, it will be created on first add
  }

  // Check done.txt parent directory if a custom path is set
  if (doneFilePath) {
    const donePath = expandPath(doneFilePath);
    const doneDir = dirname(donePath);
    try {
      const dirStat = await stat(doneDir);
      if (!dirStat.isDirectory()) {
        return `The folder for your done.txt file does not exist: ${doneDir}`;
      }
    } catch {
      return `The folder for your done.txt file does not exist: ${doneDir}`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a single todo.txt line into a TodoItem.
 * Returns null for blank/empty lines.
 */
export function parseLine(line: string, lineNumber: number): TodoItem | null {
  if (!line.trim()) return null;

  let rest = line;
  let completed = false;
  let completionDate: string | undefined;
  let priority: string | undefined;
  let creationDate: string | undefined;

  // Completed task: "x " prefix
  if (rest.startsWith("x ")) {
    completed = true;
    rest = rest.slice(2).trimStart();

    // Optional completion date
    const [maybeCompDate, ...afterCompDate] = rest.split(" ");
    if (DATE_RE.test(maybeCompDate)) {
      completionDate = maybeCompDate;
      rest = afterCompDate.join(" ");
    }
  }

  // Priority: (A) at start
  const priorityMatch = rest.match(/^\(([A-Z])\) /);
  if (priorityMatch) {
    priority = priorityMatch[1];
    rest = rest.slice(4); // "(A) ".length === 4
  }

  // Creation date
  const [maybeCreation, ...afterCreation] = rest.split(" ");
  if (DATE_RE.test(maybeCreation)) {
    creationDate = maybeCreation;
    rest = afterCreation.join(" ");
  }

  const description = rest;

  // Extract +projects, @contexts, and key:value tags
  const projects: string[] = [];
  const contexts: string[] = [];
  const tags: Record<string, string> = {};

  const words = description.split(" ");
  const textWords: string[] = [];

  for (const word of words) {
    if (word.startsWith("+") && word.length > 1 && !/\s/.test(word)) {
      projects.push(word.slice(1));
    } else if (word.startsWith("@") && word.length > 1 && !/\s/.test(word)) {
      contexts.push(word.slice(1));
    } else if (
      /^[a-zA-Z][a-zA-Z0-9_-]*:[^\s/]+$/.test(word) &&
      !word.startsWith("http")
    ) {
      const colonIdx = word.indexOf(":");
      tags[word.slice(0, colonIdx)] = word.slice(colonIdx + 1);
    } else {
      textWords.push(word);
    }
  }

  const text = textWords.join(" ").trim();

  return {
    id: randomUUID(),
    raw: line,
    completed,
    completionDate,
    priority,
    creationDate,
    text,
    description,
    projects,
    contexts,
    tags,
    lineNumber,
  };
}

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

/**
 * Serialize a TodoItem back into a todo.txt line.
 *
 * Completed format (per spec): x <completion-date> <priority> <creation-date> <description>
 * Priority is preserved on completion so it can be restored if the task is un-completed.
 */
export function serializeItem(item: TodoItem): string {
  const parts: string[] = [];

  if (item.completed) {
    parts.push("x");
    if (item.completionDate) parts.push(item.completionDate);
  }

  // Priority is always written when present (even for completed tasks)
  if (item.priority) {
    parts.push(`(${item.priority})`);
  }

  if (item.creationDate) parts.push(item.creationDate);

  parts.push(item.description);

  return parts.join(" ");
}

/**
 * Build a description string from structured fields.
 * Merges text, projects, contexts, and tags back into the description.
 */
export function buildDescription(opts: {
  text: string;
  projects?: string[];
  contexts?: string[];
  tags?: Record<string, string>;
}): string {
  const parts = [opts.text];

  for (const p of opts.projects ?? []) {
    if (!parts[0].includes(`+${p}`)) parts.push(`+${p}`);
  }
  for (const c of opts.contexts ?? []) {
    if (!parts[0].includes(`@${c}`)) parts.push(`@${c}`);
  }
  for (const [k, v] of Object.entries(opts.tags ?? {})) {
    if (!parts[0].includes(`${k}:${v}`)) parts.push(`${k}:${v}`);
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

/**
 * Read and parse the todo.txt file. Returns an empty array if the file
 * does not exist.
 */
export async function readTodos(todoFilePath: string): Promise<TodoItem[]> {
  const path = expandPath(todoFilePath);
  const exists = await fileExists(path);
  if (!exists) return [];

  const content = await readFile(path, "utf-8");
  const lines = content.split("\n");
  const items: TodoItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const item = parseLine(lines[i], i + 1);
    if (item) items.push(item);
  }

  cacheTodos(items);
  return items;
}

/**
 * Write the provided list of TodoItems back to the todo.txt file,
 * preserving the original line order. Items without a raw representation
 * (newly created) are appended at the end.
 */
export async function writeTodos(
  todoFilePath: string,
  items: TodoItem[],
): Promise<void> {
  const path = expandPath(todoFilePath);

  // Reconstruct lines: sort by lineNumber so we maintain file order
  const sorted = [...items].sort((a, b) => a.lineNumber - b.lineNumber);
  const lines = sorted.map(serializeItem);

  await writeFile(
    path,
    lines.join("\n") + (lines.length > 0 ? "\n" : ""),
    "utf-8",
  );
}

/**
 * Append a single raw todo.txt line to the todo file.
 */
export async function appendTodo(
  todoFilePath: string,
  line: string,
): Promise<void> {
  const path = expandPath(todoFilePath);

  // Ensure file exists; if not, create it
  const exists = await fileExists(path);
  if (!exists) {
    await writeFile(path, line + "\n", "utf-8");
    return;
  }

  // Read to check if file ends with a newline
  const content = await readFile(path, "utf-8");
  const prefix = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  await appendFile(path, prefix + line + "\n", "utf-8");

  // Re-read to get accurate line numbers and update cache
  const updated = await readTodos(todoFilePath);
  cacheTodos(updated);
}

/**
 * Mark a todo item as complete and optionally archive it to done.txt.
 *
 * @param todoFilePath    Path to todo.txt
 * @param doneFilePath    Path to done.txt (or undefined to derive from todoFilePath dir)
 * @param item            The item to complete
 * @param archive         If true, move to done.txt; if false, keep in todo.txt
 */
export async function completeTodo(
  todoFilePath: string,
  doneFilePath: string | undefined,
  item: TodoItem,
  archive: boolean,
): Promise<TodoItem[]> {
  const today = new Date().toISOString().split("T")[0];

  // Priority is preserved on completion (stored in the completed line so it
  // can be restored if the task is un-done later).
  const completedItem: TodoItem = {
    ...item,
    completed: true,
    completionDate: today,
  };
  completedItem.raw = serializeItem(completedItem);

  const allItems = await readTodos(todoFilePath);
  // Match by lineNumber — id is regenerated on every file read so it can't be
  // used to correlate items across reads.
  const remaining = allItems.filter((t) => t.lineNumber !== item.lineNumber);

  if (archive) {
    // Remove from todo.txt
    await writeTodos(todoFilePath, remaining);

    // Append to done.txt
    const resolvedDone = doneFilePath
      ? expandPath(doneFilePath)
      : join(dirname(expandPath(todoFilePath)), "done.txt");

    const doneExists = await fileExists(resolvedDone);
    const content = doneExists ? await readFile(resolvedDone, "utf-8") : "";
    const prefix = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
    await appendFile(
      resolvedDone,
      prefix + serializeItem(completedItem) + "\n",
      "utf-8",
    );

    cacheTodos(remaining);
    return remaining;
  } else {
    // Replace the item in place with the completed version, matched by lineNumber
    const updated = allItems.map((t) =>
      t.lineNumber === item.lineNumber ? completedItem : t,
    );
    await writeTodos(todoFilePath, updated);
    cacheTodos(updated);
    return updated;
  }
}

/**
 * Delete a todo item by id and write the result back to disk.
 */
export async function deleteTodo(
  todoFilePath: string,
  item: TodoItem,
): Promise<TodoItem[]> {
  const allItems = await readTodos(todoFilePath);
  const remaining = allItems.filter((t) => t.lineNumber !== item.lineNumber);
  await writeTodos(todoFilePath, remaining);
  cacheTodos(remaining);
  return remaining;
}

/**
 * Update a todo item in-place and write back to disk.
 */
export async function updateTodo(
  todoFilePath: string,
  updated: TodoItem,
): Promise<TodoItem[]> {
  const allItems = await readTodos(todoFilePath);
  const newItems = allItems.map((t) =>
    t.lineNumber === updated.lineNumber ? updated : t,
  );
  await writeTodos(todoFilePath, newItems);
  cacheTodos(newItems);
  return newItems;
}

/**
 * Mark a completed task as incomplete in-place within todo.txt.
 * Clears the completion mark and completion date; restores priority if present.
 */
export async function uncompleteTodo(
  todoFilePath: string,
  item: TodoItem,
): Promise<TodoItem[]> {
  const uncompletedItem: TodoItem = {
    ...item,
    completed: false,
    completionDate: undefined,
  };
  uncompletedItem.raw = serializeItem(uncompletedItem);
  return updateTodo(todoFilePath, uncompletedItem);
}

/**
 * Read and parse the done.txt file. Returns an empty array if the file
 * does not exist or if no doneFilePath is configured.
 */
export async function readDoneTodos(
  todoFilePath: string,
  doneFilePath: string | undefined,
): Promise<TodoItem[]> {
  const resolvedDone = doneFilePath
    ? expandPath(doneFilePath)
    : join(dirname(expandPath(todoFilePath)), "done.txt");

  const exists = await fileExists(resolvedDone);
  if (!exists) return [];

  const content = await readFile(resolvedDone, "utf-8");
  const lines = content.split("\n");
  const items: TodoItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const item = parseLine(lines[i], i + 1);
    if (item) items.push(item);
  }

  return items;
}

/**
 * Permanently delete an item from done.txt by line number.
 */
export async function deleteDoneTodo(
  todoFilePath: string,
  doneFilePath: string | undefined,
  item: TodoItem,
): Promise<TodoItem[]> {
  const resolvedDone = doneFilePath
    ? expandPath(doneFilePath)
    : join(dirname(expandPath(todoFilePath)), "done.txt");

  const doneItems = await readDoneTodos(todoFilePath, doneFilePath);
  const remaining = doneItems.filter((t) => t.lineNumber !== item.lineNumber);
  const doneLines = remaining.map(serializeItem);
  await writeFile(
    resolvedDone,
    doneLines.join("\n") + (doneLines.length > 0 ? "\n" : ""),
    "utf-8",
  );
  return remaining;
}

/**
 * Restore a completed task from done.txt back to todo.txt, removing the
 * completion mark and completion date but keeping everything else.
 */
export async function restoreTodo(
  todoFilePath: string,
  doneFilePath: string | undefined,
  item: TodoItem,
): Promise<TodoItem[]> {
  const resolvedDone = doneFilePath
    ? expandPath(doneFilePath)
    : join(dirname(expandPath(todoFilePath)), "done.txt");

  // Remove from done.txt
  const doneItems = await readDoneTodos(todoFilePath, doneFilePath);
  const remainingDone = doneItems.filter(
    (t) => t.lineNumber !== item.lineNumber,
  );
  const doneLines = remainingDone.map(serializeItem);
  await writeFile(
    resolvedDone,
    doneLines.join("\n") + (doneLines.length > 0 ? "\n" : ""),
    "utf-8",
  );

  // Restore to todo.txt (strip completion mark and date, keep priority)
  const restoredItem: TodoItem = {
    ...item,
    completed: false,
    completionDate: undefined,
  };
  restoredItem.raw = serializeItem(restoredItem);

  await appendTodo(todoFilePath, restoredItem.raw);

  return remainingDone;
}

// ---------------------------------------------------------------------------
// Sorting helpers
// ---------------------------------------------------------------------------

const MAX_DATE = "9999-99-99";

export function sortTodos(items: TodoItem[], order: SortOrder): TodoItem[] {
  const copy = [...items];

  switch (order) {
    case "priority":
      return copy.sort((a, b) => {
        // Completed tasks go to the bottom
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const pa = a.priority ?? "ZZ";
        const pb = b.priority ?? "ZZ";
        return pa.localeCompare(pb);
      });

    case "creation-date-desc":
      return copy.sort((a, b) => {
        const da = a.creationDate ?? "";
        const db = b.creationDate ?? "";
        return db.localeCompare(da);
      });

    case "creation-date-asc":
      return copy.sort((a, b) => {
        const da = a.creationDate ?? MAX_DATE;
        const db = b.creationDate ?? MAX_DATE;
        return da.localeCompare(db);
      });

    case "due-date":
      return copy.sort((a, b) => {
        const da = a.tags["due"] ?? MAX_DATE;
        const db = b.tags["due"] ?? MAX_DATE;
        return da.localeCompare(db);
      });

    case "alpha":
      return copy.sort((a, b) =>
        a.text.toLowerCase().localeCompare(b.text.toLowerCase()),
      );

    default:
      return copy;
  }
}
