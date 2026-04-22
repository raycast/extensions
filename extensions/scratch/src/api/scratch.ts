import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type Preferences = {
  scratchCliPath?: string;
};

let resolvedScratchPath: string | null = null;

export interface ScratchDoctorReport {
  ok: boolean;
  notesFolder?: string | null;
  notesFolderSource: string;
  appConfigPath: string;
  settingsPath: string;
  settingsExists: boolean;
  tasksDbPath: string;
  tasksDbExists: boolean;
  canReadTasks: boolean;
  taskCount?: number | null;
  warnings: string[];
}

export interface ScratchNoteSummary {
  id: string;
  title: string;
  preview: string;
  path: string;
  modified: number;
}

export interface ScratchNote {
  id: string;
  title: string;
  content: string;
  path: string;
  modified: number;
}

export interface ScratchTaskSummary {
  id: string;
  title: string;
  description: string;
  link: string;
  waitingFor: string;
  createdAt: string;
  actionAt?: string | null;
  scheduleBucket?: string | null;
  completedAt?: string | null;
  view: string;
  overdue: boolean;
  completed: boolean;
}

export interface ScratchTask {
  id: string;
  title: string;
  description: string;
  link: string;
  waitingFor: string;
  createdAt: string;
  actionAt?: string | null;
  scheduleBucket?: string | null;
  completedAt?: string | null;
}

export interface CreateNoteInput {
  title: string;
  folder?: string;
  content?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  link?: string;
  waitingFor?: string;
  date?: string;
  bucket?: "anytime" | "someday";
}

async function runCandidate(command: string, args: string[]) {
  return execFileAsync(command, args, {
    maxBuffer: 10 * 1024 * 1024,
  });
}

function getScratchCandidates(): string[] {
  const preferences = getPreferenceValues<Preferences>();

  return [
    preferences.scratchCliPath?.trim(),
    process.env.SCRATCH_CLI_PATH,
    "scratch",
    "/opt/homebrew/bin/scratch",
    "/usr/local/bin/scratch",
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);
}

async function resolveScratchPath(): Promise<string> {
  if (resolvedScratchPath) {
    return resolvedScratchPath;
  }

  const probeArgs = ["doctor", "--format", "json"];
  let lastError: unknown;

  for (const command of getScratchCandidates()) {
    try {
      await runCandidate(command, probeArgs);
      resolvedScratchPath = command;
      return command;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `${lastError.message}. Install the Scratch CLI first or set Scratch CLI Path in Raycast preferences.`
      : "Scratch CLI not found. Install the Scratch CLI first or set Scratch CLI Path in Raycast preferences.",
  );
}

async function runScratch(args: string[]): Promise<string> {
  const command = await resolveScratchPath();

  try {
    const result = await runCandidate(command, args);
    return result.stdout.trim();
  } catch (error) {
    if (error && typeof error === "object" && "stderr" in error) {
      const stderr = String(error.stderr || "").trim();
      if (stderr) {
        throw new Error(stderr.replace(/^error:\s*/i, ""));
      }
    }

    throw error instanceof Error ? error : new Error("Scratch CLI failed");
  }
}

async function runScratchJson<T>(args: string[]): Promise<T> {
  const output = await runScratch(args);
  return JSON.parse(output) as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

export async function getDoctorReport(): Promise<ScratchDoctorReport> {
  return runScratchJson<ScratchDoctorReport>(["doctor", "--format", "json"]);
}

export async function listNotes(): Promise<ScratchNoteSummary[]> {
  return runScratchJson<ScratchNoteSummary[]>(["note", "list", "--format", "json"]);
}

export async function createNote(input: CreateNoteInput): Promise<ScratchNote> {
  const args = ["note", "create", input.title];

  if (input.folder?.trim()) {
    args.push("--folder", input.folder.trim());
  }
  if (input.content?.trim()) {
    args.push("--content", input.content);
  }

  args.push("--format", "json");
  return runScratchJson<ScratchNote>(args);
}

export async function deleteNote(id: string): Promise<void> {
  await runScratch(["note", "delete", id]);
}

export async function listTasks(): Promise<ScratchTaskSummary[]> {
  return runScratchJson<ScratchTaskSummary[]>(["task", "list", "--view", "all", "--format", "json"]);
}

export async function createTask(input: CreateTaskInput): Promise<ScratchTask> {
  const args = ["task", "create", input.title];

  if (input.description?.trim()) {
    args.push("--description", input.description);
  }
  if (input.link?.trim()) {
    args.push("--link", input.link.trim());
  }
  if (input.waitingFor?.trim()) {
    args.push("--waiting-for", input.waitingFor.trim());
  }
  if (input.date?.trim()) {
    args.push("--date", input.date.trim());
  } else if (input.bucket) {
    args.push("--bucket", input.bucket);
  }

  args.push("--format", "json");
  return runScratchJson<ScratchTask>(args);
}

export async function completeTask(id: string): Promise<ScratchTask> {
  return runScratchJson<ScratchTask>(["task", "complete", id, "--format", "json"]);
}

export async function reopenTask(id: string): Promise<ScratchTask> {
  return runScratchJson<ScratchTask>(["task", "reopen", id, "--format", "json"]);
}

export async function deleteTask(id: string): Promise<void> {
  await runScratch(["task", "delete", id]);
}
