import { isRecord, isStringArray, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";

// `run` is empty for a file task, whose script is `file`. Older releases may omit both.
export type Task = {
  name: string;
  description: string;
  aliases: string[];
  source: string;
  dir: string;
  run: string[];
  file?: string;
};

export function parseTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) throw new MiseOutputError("mise tasks ls: expected an array", JSON.stringify(raw));
  return raw.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.name !== "string" ||
      typeof entry.description !== "string" ||
      !isStringArray(entry.aliases) ||
      typeof entry.source !== "string" ||
      typeof entry.dir !== "string"
    ) {
      throw new MiseOutputError("mise tasks ls: task is malformed", JSON.stringify(entry));
    }
    const task: Task = {
      name: entry.name,
      description: entry.description,
      aliases: entry.aliases,
      source: entry.source,
      dir: entry.dir,
      run: isStringArray(entry.run) ? entry.run : [],
    };
    if (typeof entry.file === "string") task.file = entry.file;
    return task;
  });
}

// -g keeps a project config under ~ (such as ~/mise.toml) out of the global task list.
export function listTasks(location: MiseLocation): Promise<Task[]> {
  return miseJson(location, ["tasks", "ls", "-g"], parseTasks);
}

// Tasks are namespaced with a colon (dotfiles:apply); the prefix is the section they belong to.
export function taskGroup(name: string): string | undefined {
  const index = name.indexOf(":");
  return index > 0 ? name.slice(0, index) : undefined;
}

// mise added `tasks add`, `tasks set` and `tasks rm` in this release.
export const TASK_EDITING_SINCE = "2026.10.25";

// `tasks set` and `tasks rm --path <source>` change a TOML task in whichever config file defines
// it, conf.d files included. File tasks are scripts that `tasks set` refuses.
export function canEditTask(task: Task): boolean {
  return task.file === undefined && task.source.endsWith(".toml");
}

// mise writes almost any name, but `mise run` reads some as something else: a leading - as a flag,
// a leading : or // and ... as monorepo paths, and * ? [ ] { } as a glob over other tasks.
// Whitespace also runs, but would break the `mise run <task>` this extension copies and types.
export function validateTaskName(name: string, taken: string[] = []): string | undefined {
  if (!name) return "Enter a name";
  if (/\s/.test(name)) return "Use : or - instead of spaces";
  if (name.startsWith("-")) return "Can't start with -";
  if (name.startsWith(":") || name.startsWith("//") || name.includes("...")) {
    return "Can't start with : or // or contain ..., which mise reads as a monorepo path";
  }
  if (/[*?[\]{}]/.test(name)) return "Can't contain * ? [ ] { }, which mise run reads as a pattern";
  if (taken.includes(name)) return "A task with this name already exists";
  return undefined;
}

export type SplitCommand = { words: string[] } | { error: string };

const SHELL_SYNTAX_ERROR =
  "mise quotes each word, so | & ; < > $ ` * ? and similar would run literally; wrap it as sh -c '…'";
const UNQUOTED_SYNTAX = new Set("|&;<>()$`*?[]{}");
const WORD_START_SYNTAX = new Set(["#", "~"]);
const ASSIGNMENT = /^\s*[A-Za-z_][A-Za-z0-9_]*=/;

// `mise tasks add/set -- <run>` shell-quotes each word it is given and joins them into the task's
// `run`. So the form splits a command line into words the way sh would and refuses anything sh
// would have interpreted (pipes, variables, globs, leading VAR=value), which quoting would turn
// into literal text.
export function splitCommand(line: string): SplitCommand {
  if (ASSIGNMENT.test(line)) return { error: "Leading VAR=value would run as a command; wrap it as sh -c '…'" };
  const words: string[] = [];
  let word: string | undefined;
  let quote: "'" | '"' | undefined;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote === "'") {
      if (char === "'") quote = undefined;
      else word += char;
    } else if (quote === '"') {
      if (char === '"') quote = undefined;
      else if (char === "\\" && '"\\$`'.includes(line[i + 1] ?? "")) word += line[++i];
      else if (char === "$" || char === "`") return { error: SHELL_SYNTAX_ERROR };
      else word += char;
    } else if (char === " " || char === "\t") {
      if (word !== undefined) words.push(word);
      word = undefined;
    } else if (char === "'" || char === '"') {
      word ??= "";
      quote = char;
    } else if (char === "\\") {
      if (i + 1 === line.length) return { error: "Ends with a lone \\" };
      word = (word ?? "") + line[++i];
    } else if (UNQUOTED_SYNTAX.has(char) || (word === undefined && WORD_START_SYNTAX.has(char))) {
      return { error: SHELL_SYNTAX_ERROR };
    } else {
      word = (word ?? "") + char;
    }
  }
  if (quote) return { error: `Close the ${quote} quote` };
  if (word !== undefined) words.push(word);
  if (words.length === 0) return { error: "Enter a command" };
  return { words };
}

export type TaskWrite = { task: string; action: string; path: string };

// The JSON `mise tasks add` and `tasks set` print: action is added, replaced, updated or unchanged.
export function parseTaskWrite(raw: unknown): TaskWrite {
  if (
    !isRecord(raw) ||
    typeof raw.task !== "string" ||
    typeof raw.action !== "string" ||
    typeof raw.path !== "string"
  ) {
    throw new MiseOutputError("mise tasks add: expected a task write", JSON.stringify(raw));
  }
  return { task: raw.task, action: raw.action, path: raw.path };
}

// `tasks add` replaces a task of the same name without asking. A dry run with no fields reports
// "replaced" when the global config already has one, hidden tasks included.
export function previewAddTask(location: MiseLocation, name: string): Promise<TaskWrite> {
  return miseJson(location, ["tasks", "add", "--global", "--dry-run", name], parseTaskWrite);
}
