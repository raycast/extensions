import { constants } from "fs";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import { basename, dirname, extname, isAbsolute, join } from "path";

export type NewTodoPlacement = "append" | "prepend";

export interface ExtensionPreferences {
  vaultPath: string;
  todoNotePath: string;
  createNoteIfMissing: boolean;
  newTodoPlacement: NewTodoPlacement;
}

export interface TodoItem {
  id: string;
  lineIndex: number;
  text: string;
  completed: boolean;
  indent: number;
  bullet: "-" | "*";
}

export interface TodoNote {
  notePath: string;
  lines: string[];
  todos: TodoItem[];
}

const TASK_PATTERN = /^(\s*)([-*])\s+\[([ xX])\]\s+(.*)$/;

export function resolveTodoNotePath(preferences: ExtensionPreferences): string {
  if (isAbsolute(preferences.todoNotePath)) {
    return preferences.todoNotePath;
  }

  return join(preferences.vaultPath, preferences.todoNotePath);
}

export function buildObsidianOpenUrl(notePath: string): string {
  return `obsidian://open?path=${encodeURIComponent(notePath)}`;
}

export async function loadTodoNote(preferences: ExtensionPreferences): Promise<TodoNote> {
  const notePath = resolveTodoNotePath(preferences);
  await ensureTodoNoteExists(notePath, preferences.createNoteIfMissing);

  const content = await readFile(notePath, "utf8");
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.length === 0 ? [] : normalized.split("\n");

  if (lines.at(-1) === "") {
    lines.pop();
  }

  return {
    notePath,
    lines,
    todos: parseTodos(lines),
  };
}

export async function addTodo(preferences: ExtensionPreferences, text: string): Promise<void> {
  const note = await loadTodoNote(preferences);
  const lines = [...note.lines];
  const newLine = buildTaskLine(text);
  const insertIndex = preferences.newTodoPlacement === "prepend" ? getPrependInsertIndex(lines) : lines.length;

  lines.splice(insertIndex, 0, newLine);
  await saveTodoNote(note.notePath, lines);
}

export async function setTodoCompleted(
  preferences: ExtensionPreferences,
  todo: TodoItem,
  completed: boolean
): Promise<void> {
  const note = await loadTodoNote(preferences);
  note.lines[todo.lineIndex] = buildTaskLine(todo.text, completed, todo.indent, todo.bullet);
  await saveTodoNote(note.notePath, note.lines);
}

export async function updateTodoText(
  preferences: ExtensionPreferences,
  todo: TodoItem,
  text: string
): Promise<void> {
  const note = await loadTodoNote(preferences);
  note.lines[todo.lineIndex] = buildTaskLine(text, todo.completed, todo.indent, todo.bullet);
  await saveTodoNote(note.notePath, note.lines);
}

export async function deleteTodo(preferences: ExtensionPreferences, todo: TodoItem): Promise<void> {
  const note = await loadTodoNote(preferences);
  note.lines.splice(todo.lineIndex, 1);
  await saveTodoNote(note.notePath, note.lines);
}

async function ensureTodoNoteExists(notePath: string, createIfMissing: boolean): Promise<void> {
  if (await exists(notePath)) {
    return;
  }

  if (!createIfMissing) {
    throw new Error(`The note does not exist yet: ${notePath}`);
  }

  await mkdir(dirname(notePath), { recursive: true });
  await writeFile(notePath, createStarterNote(notePath), "utf8");
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function parseTodos(lines: string[]): TodoItem[] {
  return lines.flatMap((line, lineIndex) => {
    const match = line.match(TASK_PATTERN);
    if (!match) {
      return [];
    }

    const [, whitespace, bullet, completedState, text] = match;
    return [
      {
        id: `${lineIndex}:${text}`,
        lineIndex,
        text,
        completed: completedState.toLowerCase() === "x",
        indent: whitespace.length,
        bullet: bullet as "-" | "*",
      },
    ];
  });
}

function buildTaskLine(text: string, completed = false, indent = 0, bullet: "-" | "*" = "-"): string {
  return `${" ".repeat(indent)}${bullet} [${completed ? "x" : " "}] ${text.trim()}`;
}

function getPrependInsertIndex(lines: string[]): number {
  let index = 0;

  if (lines[0] === "---") {
    const frontmatterEnd = lines.indexOf("---", 1);
    if (frontmatterEnd >= 0) {
      index = frontmatterEnd + 1;
    }
  }

  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }

  if (index < lines.length && /^#{1,6}\s+/.test(lines[index])) {
    index += 1;

    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }
  }

  return index;
}

function createStarterNote(notePath: string): string {
  const title = basename(notePath, extname(notePath)) || "ToDo";
  return `# ${title}\n\n`;
}

async function saveTodoNote(notePath: string, lines: string[]): Promise<void> {
  const content = lines.length === 0 ? "" : `${lines.join("\n")}\n`;
  await writeFile(notePath, content, "utf8");
}
