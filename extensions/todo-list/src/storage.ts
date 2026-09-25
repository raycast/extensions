import fs from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { TodoItem, TodoSections } from "./types";

function parseItem(value: unknown): TodoItem {
  if (
    typeof value !== "object" ||
    value === null ||
    !("title" in value) ||
    typeof value.title !== "string" ||
    !("completed" in value) ||
    typeof value.completed !== "boolean" ||
    !("timeAdded" in value) ||
    typeof value.timeAdded !== "number" ||
    !Number.isFinite(value.timeAdded) ||
    ("tag" in value && value.tag !== undefined && typeof value.tag !== "string") ||
    ("dueDate" in value &&
      value.dueDate !== undefined &&
      (typeof value.dueDate !== "number" ||
        !Number.isFinite(value.dueDate) ||
        !Number.isFinite(new Date(value.dueDate).getTime()))) ||
    ("priority" in value &&
      value.priority !== undefined &&
      value.priority !== 1 &&
      value.priority !== 2 &&
      value.priority !== 3)
  ) {
    throw new Error("Invalid todo data. The original file has not been changed.");
  }
  return {
    title: value.title,
    completed: value.completed,
    timeAdded: value.timeAdded,
    tag: "tag" in value && typeof value.tag === "string" ? value.tag : undefined,
    dueDate: "dueDate" in value && typeof value.dueDate === "number" ? value.dueDate : undefined,
    priority:
      "priority" in value && (value.priority === 1 || value.priority === 2 || value.priority === 3)
        ? value.priority
        : undefined,
  };
}

function parseItems(value: unknown): TodoItem[] {
  if (!Array.isArray(value)) throw new Error("Invalid todo section. Expected a list of tasks.");
  return value.map(parseItem);
}

export function parseTodos(contents: string): TodoSections {
  const value: unknown = JSON.parse(contents);
  if (Array.isArray(value) && value.length === 2) {
    const items = parseItems(value[1]);
    return {
      pinned: parseItems(value[0]),
      todo: items.filter((item) => !item.completed),
      completed: items.filter((item) => item.completed),
    };
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("pinned" in value) ||
    !("todo" in value) ||
    !("completed" in value)
  ) {
    throw new Error("Invalid todo file. Use a Todo List JSON backup or the original todo.json file.");
  }
  return { pinned: parseItems(value.pinned), todo: parseItems(value.todo), completed: parseItems(value.completed) };
}

function readFile(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export function readTodos(file: string): { sections: TodoSections; revision: string | null } {
  const revision = readFile(file);
  if (revision === null) return { sections: { pinned: [], todo: [], completed: [] }, revision };
  try {
    return { sections: parseTodos(revision), revision };
  } catch (error) {
    throw new Error(`Could not read ${file}. Use Import Todo Backup to recover your list. ${String(error)}`);
  }
}

const lockWait = new Int32Array(new SharedArrayBuffer(4));

function withFileLock<T>(file: string, action: () => T): T {
  fs.mkdirSync(dirname(file), { recursive: true });
  const lockFile = `${file}.lock`;
  const deadline = Date.now() + 2000;
  let fd: number | undefined;
  while (fd === undefined) {
    try {
      fd = fs.openSync(lockFile, "wx");
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
      try {
        if (Date.now() - fs.statSync(lockFile).mtimeMs > 10_000) fs.rmSync(lockFile, { force: true });
      } catch {
        // The lock was released between the failed create and this check.
      }
      if (Date.now() > deadline) throw new Error("The list is being saved by another command. Try again.");
      Atomics.wait(lockWait, 0, 0, 20);
    }
  }
  try {
    return action();
  } finally {
    fs.closeSync(fd);
    fs.rmSync(lockFile, { force: true });
  }
}

function atomicWrite(file: string, contents: string) {
  fs.mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, contents, { encoding: "utf8", mode: 0o600, flag: "wx" });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

export function writeTodos(file: string, sections: TodoSections, expectedRevision: string | null): string {
  const contents = JSON.stringify(parseTodos(JSON.stringify(sections)));
  return withFileLock(file, () => {
    const current = readFile(file);
    if (current !== expectedRevision)
      throw new Error("The list changed in another command. Reopen this command and try again.");
    if (current !== null) {
      parseTodos(current);
      atomicWrite(`${file}.backup`, current);
    }
    atomicWrite(file, contents);
    return contents;
  });
}

/** Import is explicit recovery: preserve even an unreadable current file before replacing it. */
export function importTodos(file: string, contents: string): TodoSections {
  const sections = parseTodos(contents);
  return withFileLock(file, () => {
    const current = readFile(file);
    if (current !== null) atomicWrite(`${file}.${Date.now()}.${randomUUID()}.backup`, current);
    atomicWrite(file, JSON.stringify(sections));
    return sections;
  });
}

export function exportTodos(file: string, destination: string): void {
  const { sections } = readTodos(file);
  fs.writeFileSync(destination, JSON.stringify(sections, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 });
}
