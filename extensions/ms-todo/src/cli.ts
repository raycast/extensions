import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);
// Outlast the CLI's 15-second daemon startup and 300-second request stall limits.
const CLI_TIMEOUT_MS = 330_000;
const UNCERTAIN_WRITE_GUIDANCE =
  "The change may have happened; check tasks and outbox before retrying.";

const dateTimeSchema = z.object({
  dateTime: z.string(),
  timeZone: z.string().optional(),
});
const bodySchema = z.object({ content: z.string(), contentType: z.string() });
const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  list: z.string().optional(),
  sync_state: z.string().optional(),
  list_id: z.string().optional(),
  importance: z.enum(["low", "normal", "high"]).optional(),
  dueDateTime: dateTimeSchema.nullable().optional(),
  reminderDateTime: dateTimeSchema.nullable().optional(),
  body: bodySchema.nullable().optional(),
  categories: z.array(z.string()).optional(),
});
const collectionSchema = z.object({
  schema_version: z.literal(2),
  sync: z.object({ state: z.string(), generation: z.number() }),
  items: z.array(taskSchema),
});
const listSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  folder: z.string().nullable().optional(),
  sync_state: z.string().optional(),
});
const listsSchema = z.object({
  schema_version: z.literal(2),
  sync: z.object({ state: z.string(), generation: z.number() }),
  items: z.array(listSchema),
});
const taskDetailSchema = taskSchema.extend({ schema_version: z.literal(2) });
const suggestionSchema = taskSchema.extend({ suggestion: z.string() });
const suggestionsSchema = collectionSchema.extend({
  items: z.array(suggestionSchema),
});
const mutationSchema = z.object({
  schema_version: z.literal(2),
  action: z.string(),
  op_id: z.string(),
  items: z.array(z.object({ id: z.string() })),
});
const errorSchema = z.object({ error: z.object({ message: z.string() }) });
const execErrorSchema = z.object({
  stderr: z.string().optional(),
  killed: z.boolean().optional(),
  code: z.union([z.string(), z.number()]).optional(),
  message: z.string(),
});

export type Task = z.infer<typeof taskSchema>;
export type TaskList = z.infer<typeof listSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type SuggestionsCollection = Pick<
  z.infer<typeof suggestionsSchema>,
  "sync" | "items"
>;
export type ListsCollection = Pick<
  z.infer<typeof listsSchema>,
  "sync" | "items"
>;
export type TaskListQuery = {
  status: "open" | "completed" | "all";
  listId?: string;
  due?: "today" | "overdue";
  importance?: "high";
};
export type TaskEdit = {
  title?: string;
  due?: string;
  importance?: "low" | "normal" | "high";
};
export type Collection = Pick<
  z.infer<typeof collectionSchema>,
  "sync" | "items"
>;

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

function executable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function findCli(
  preferredPath = "",
  pathEnv = process.env.PATH ?? "",
): string {
  if (preferredPath.trim()) {
    const path = preferredPath.trim();
    if (!isAbsolute(path) || !executable(path)) {
      throw new CliError(
        `The configured ms-todo CLI path is not an executable absolute path: ${path}`,
      );
    }
    return path;
  }
  const candidates = [
    "/opt/homebrew/bin/ms-todo",
    "/usr/local/bin/ms-todo",
    ...(process.env.HOME ? [join(process.env.HOME, ".local/bin/ms-todo")] : []),
    ...pathEnv
      .split(delimiter)
      .filter(Boolean)
      .map((dir) => join(dir, "ms-todo")),
  ];
  const found = candidates.find(executable);
  if (!found) {
    throw new CliError(
      "ms-todo is not installed or Raycast cannot find it. Install it with Homebrew, or set CLI Path in extension preferences.",
    );
  }
  return found;
}

function errorMessage(stderr: string, fallback: string): string {
  try {
    const parsed = errorSchema.safeParse(JSON.parse(stderr));
    if (parsed.success) return parsed.data.error.message;
  } catch {
    // Failures before CLI startup may not produce JSON.
  }
  return stderr.trim() || fallback;
}

function parseOutput<T>(
  stdout: string,
  schema: z.ZodType<T>,
  responseError: string,
): T {
  let data: unknown;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new CliError(
      "ms-todo returned invalid JSON. Check that the installed CLI is current.",
    );
  }
  if (!z.object({ schema_version: z.literal(2) }).safeParse(data).success) {
    throw new CliError(
      "ms-todo returned an unsupported JSON schema. Update the CLI.",
    );
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new CliError(responseError);
  return parsed.data;
}

async function runCli<T>(
  args: string[],
  schema: z.ZodType<T>,
  responseError: string,
  preferredPath = "",
  uncertainWriteResponse = false,
): Promise<T> {
  const path = findCli(preferredPath);
  try {
    const { stdout } = await execFileAsync(
      path,
      ["--format", "json", ...args],
      {
        timeout: CLI_TIMEOUT_MS,
        maxBuffer: 32 * 1024 * 1024,
        encoding: "utf8",
      },
    );
    try {
      return parseOutput(stdout, schema, responseError);
    } catch (error) {
      if (uncertainWriteResponse && error instanceof CliError) {
        throw new CliError(`${error.message} ${UNCERTAIN_WRITE_GUIDANCE}`);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    const failure = execErrorSchema.safeParse(error);
    if (!failure.success) throw new CliError(String(error));
    if (failure.data.killed) {
      const isWrite =
        (args[0] === "tasks" &&
          ["add", "complete", "reopen", "edit", "delete"].includes(args[1])) ||
        (args[0] === "myday" && ["add", "remove"].includes(args[1]));
      throw new CliError(
        isWrite
          ? `ms-todo did not respond within 5½ minutes. ${UNCERTAIN_WRITE_GUIDANCE}`
          : "ms-todo did not respond within 5½ minutes. Check the daemon with `ms-todo doctor`.",
      );
    }
    if (failure.data.code === "ENOENT") {
      throw new CliError(
        "The ms-todo CLI disappeared. Check CLI Path in extension preferences.",
      );
    }
    throw new CliError(
      errorMessage(failure.data.stderr ?? "", failure.data.message),
    );
  }
}

const COLLECTION_ERROR =
  "ms-todo returned an incomplete task collection. Update the CLI.";

export async function listTasks(
  query: TaskListQuery,
  preferredPath = "",
): Promise<Collection> {
  const args = ["tasks", "list", "--status", query.status];
  if (query.listId) args.push("--list", query.listId);
  if (query.due) args.push("--due", query.due);
  if (query.importance) args.push("--importance", query.importance);
  return runCli(args, collectionSchema, COLLECTION_ERROR, preferredPath);
}

export async function listTaskLists(
  preferredPath = "",
): Promise<ListsCollection> {
  return runCli(
    ["lists", "list"],
    listsSchema,
    "ms-todo returned an incomplete list collection. Update the CLI.",
    preferredPath,
  );
}

export async function showTask(id: string, preferredPath = ""): Promise<Task> {
  return runCli(
    ["tasks", "show", id],
    taskDetailSchema,
    "ms-todo returned an incomplete task. Update the CLI.",
    preferredPath,
  );
}

export async function myDaySuggestions(
  preferredPath = "",
): Promise<SuggestionsCollection> {
  return runCli(
    ["myday", "suggest"],
    suggestionsSchema,
    COLLECTION_ERROR,
    preferredPath,
  );
}

export async function myDay(preferredPath = ""): Promise<Collection> {
  return runCli(
    ["myday", "list"],
    collectionSchema,
    COLLECTION_ERROR,
    preferredPath,
  );
}

async function write(
  args: string[],
  action: string,
  preferredPath: string,
): Promise<void> {
  const confirmationError = `ms-todo did not confirm ${action.replaceAll("_", " ")}.`;
  const result = await runCli(
    args,
    mutationSchema,
    confirmationError,
    preferredPath,
    true,
  );
  if (result.action !== action) {
    throw new CliError(`${confirmationError} ${UNCERTAIN_WRITE_GUIDANCE}`);
  }
  if (action === "add" && result.items.length === 0) {
    throw new CliError(`${confirmationError} ${UNCERTAIN_WRITE_GUIDANCE}`);
  }
}

export async function addTask(
  text: string,
  preferredPath = "",
  listId?: string,
): Promise<void> {
  await write(
    ["tasks", "add", text, ...(listId ? ["--list", listId] : []), "--strict"],
    "add",
    preferredPath,
  );
}

export async function completeTask(
  id: string,
  preferredPath = "",
): Promise<void> {
  await write(["tasks", "complete", id], "complete", preferredPath);
}

export async function reopenTask(
  id: string,
  preferredPath = "",
): Promise<void> {
  await write(["tasks", "reopen", id], "reopen", preferredPath);
}

export async function editTask(
  id: string,
  edit: TaskEdit,
  preferredPath = "",
): Promise<void> {
  const args = ["tasks", "edit", id];
  if (edit.title !== undefined) args.push("--title", edit.title);
  if (edit.due !== undefined) {
    if (edit.due === "-") args.push("--clear-due");
    else args.push("--due", edit.due);
  }
  if (edit.importance !== undefined) args.push("--importance", edit.importance);
  if (args.length === 3)
    throw new CliError("Choose at least one change to save.");
  await write(args, "edit", preferredPath);
}

export async function deleteTask(
  id: string,
  preferredPath = "",
): Promise<void> {
  await write(["tasks", "delete", id, "--yes"], "delete", preferredPath);
}

export async function addToMyDay(
  id: string,
  preferredPath = "",
): Promise<void> {
  await write(["myday", "add", id], "my_day_add", preferredPath);
}

export async function removeFromMyDay(
  id: string,
  preferredPath = "",
): Promise<void> {
  await write(["myday", "remove", id], "my_day_remove", preferredPath);
}
