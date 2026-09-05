import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { isWindowsPlatform } from "./platform";
import { buildProjectSetupSuggestions, type WorkspaceSetupTask } from "./project-setup-suggestion";

const execFileAsync = promisify(execFile);

/** Cap setup seed so leftover pills remain available in Actions (CmdPal-shaped). */
export const MAX_SETUP_SEED_TASKS = 4;

/** Local heuristics are short; keep the seed tiny so the form dropdown still has choices. */
export const LOCAL_SETUP_SEED_TASKS = 2;

const PREFERRED_SEED_TASK_TYPES = new Set(["frontend", "api", "services", "test", "build"]);
const PREFERRED_SEED_COMMAND_HINTS = ["dev", "start", "test", "build", "watch", "run"];

export type SuggestionPill = {
  command: string;
  taskType: string;
  typeTitle: string;
  displayTitle: string;
  tooltip: string;
};

export type SuggestionResponse = {
  generation: number;
  pills: SuggestionPill[];
};

export type WorkspaceSuggestionResult = {
  source: "suggest" | "local";
  tasks: WorkspaceSetupTask[];
  pills: SuggestionPill[];
};

export function resolveSuggestExecutable(assetsPath?: string): string | null {
  const fromEnv = process.env.QUICKSHELL_SUGGEST_EXE?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const packaged = path.join(assetsPath ?? path.join(__dirname, "..", "..", "assets"), "QuickShell.Suggest.exe");
  return packaged;
}

export function buildSuggestCommandArgs(directory: string, usedCommands: string[], generation: number): string[] {
  const args = ["suggest", "--dir", directory, "--generation", String(generation)];
  for (const command of usedCommands) {
    const trimmed = command.trim();
    if (trimmed.length > 0) {
      args.push("--used", trimmed);
    }
  }
  return args;
}

export function pillsToSetupTasks(pills: SuggestionPill[]): WorkspaceSetupTask[] {
  const tasks: WorkspaceSetupTask[] = [];
  const seen = new Set<string>();
  for (const pill of pills) {
    const command = pill.command?.trim();
    if (!command) {
      continue;
    }
    const key = command.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tasks.push({
      label: (pill.displayTitle || pill.typeTitle || command).trim() || command,
      command,
      taskType: pill.taskType?.trim() || "none",
    });
  }
  return tasks;
}

/** Present seeded tasks as selectable pills without auto-applying them (manual create flow). */
export function combineSuggestionTasksAndPills(tasks: WorkspaceSetupTask[], pills: SuggestionPill[]): SuggestionPill[] {
  const combined: SuggestionPill[] = tasks.map((task) => ({
    command: task.command,
    taskType: task.taskType?.trim() || "none",
    typeTitle: task.taskType?.trim() || "Setup",
    displayTitle: task.label,
    tooltip: task.command,
  }));
  const seen = new Set(combined.map((pill) => pill.command.trim().toLowerCase()));
  for (const pill of pills) {
    const key = pill.command.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      combined.push(pill);
    }
  }
  return combined;
}

export function isPreferredSetupSeedPill(pill: SuggestionPill): boolean {
  const taskType = pill.taskType?.trim().toLowerCase() ?? "";
  if (PREFERRED_SEED_TASK_TYPES.has(taskType)) {
    return true;
  }

  const command = pill.command?.trim().toLowerCase() ?? "";
  if (!command) {
    return false;
  }

  return PREFERRED_SEED_COMMAND_HINTS.some(
    (hint) =>
      command === hint ||
      command.endsWith(` ${hint}`) ||
      command.includes(` run ${hint}`) ||
      command.includes(` task ${hint}`) ||
      command.startsWith(`${hint} `),
  );
}

/**
 * Split ranked Suggest pills into a short setup seed and leftover Actions pills.
 * Preferred task types / setup-like commands are taken first, capped at MAX_SETUP_SEED_TASKS.
 */
export function splitPillsIntoSeedAndLeftover(
  pills: SuggestionPill[],
  maxSeed = MAX_SETUP_SEED_TASKS,
): { tasks: WorkspaceSetupTask[]; leftoverPills: SuggestionPill[] } {
  const usable = pills.filter((pill) => pill.command?.trim());
  if (usable.length === 0) {
    return { tasks: [], leftoverPills: [] };
  }

  const seedPills: SuggestionPill[] = [];
  const leftover: SuggestionPill[] = [];
  const seedCommands = new Set<string>();

  for (const pill of usable) {
    const key = pill.command.trim().toLowerCase();
    if (seedPills.length < maxSeed && isPreferredSetupSeedPill(pill) && !seedCommands.has(key)) {
      seedPills.push(pill);
      seedCommands.add(key);
      continue;
    }
    leftover.push(pill);
  }

  if (seedPills.length === 0) {
    const take = Math.min(Math.max(1, Math.min(2, maxSeed)), usable.length);
    for (let index = 0; index < take; index += 1) {
      seedPills.push(usable[index]);
      seedCommands.add(usable[index].command.trim().toLowerCase());
    }
    return {
      tasks: pillsToSetupTasks(seedPills),
      leftoverPills: usable.filter((pill) => !seedCommands.has(pill.command.trim().toLowerCase())),
    };
  }

  return {
    tasks: pillsToSetupTasks(seedPills),
    leftoverPills: leftover.filter((pill) => !seedCommands.has(pill.command.trim().toLowerCase())),
  };
}

function isSuggestionPill(value: unknown): value is SuggestionPill {
  if (!value || typeof value !== "object") {
    return false;
  }

  const pill = value as Record<string, unknown>;
  return (
    typeof pill.command === "string" &&
    typeof pill.taskType === "string" &&
    typeof pill.typeTitle === "string" &&
    typeof pill.displayTitle === "string" &&
    typeof pill.tooltip === "string"
  );
}

/** Parse Suggest CLI JSON; drop malformed pills. Returns null when the payload is unusable. */
export function parseSuggestionResponse(value: unknown): SuggestionResponse | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.generation !== "number" || !Number.isFinite(record.generation) || !Array.isArray(record.pills)) {
    return null;
  }

  const pills = record.pills.filter(isSuggestionPill);
  // Non-empty array with zero valid pills is a corrupt payload, not "no suggestions".
  if (record.pills.length > 0 && pills.length === 0) {
    return null;
  }

  return { generation: record.generation, pills };
}

/** Spawn/exec failures from Suggest.exe (missing binary, non-zero exit, signals). */
function isExpectedSuggestExecFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const execError = error as NodeJS.ErrnoException & {
    signal?: NodeJS.Signals | null;
    status?: number | null;
  };
  return (
    typeof execError.code === "string" ||
    typeof execError.code === "number" ||
    execError.signal != null ||
    typeof execError.status === "number"
  );
}

function formatSuggestExecFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return "unknown error";
  }

  const execError = error as NodeJS.ErrnoException & {
    signal?: NodeJS.Signals | null;
  };
  const parts: string[] = [];
  if (execError.code != null) {
    parts.push(`code=${execError.code}`);
  }
  if (execError.signal) {
    parts.push(`signal=${execError.signal}`);
  }
  if (parts.length === 0) {
    parts.push(error.name);
  }
  return parts.join(" ");
}

export async function fetchSuggestionPills(
  directory: string,
  usedCommands: string[],
  generation: number,
  assetsPath?: string,
): Promise<SuggestionResponse | null> {
  const fromEnv = process.env.QUICKSHELL_SUGGEST_EXE?.trim();
  // Packaged Suggest.exe is Windows-only; allow an explicit override for local experiments.
  if (!fromEnv && !isWindowsPlatform()) {
    return null;
  }

  const executable = resolveSuggestExecutable(assetsPath);
  if (!executable || !existsSync(executable)) {
    if (isWindowsPlatform()) {
      console.warn(
        "[quickshell] Suggest CLI not found (assets/QuickShell.Suggest.exe missing from the extension package).",
      );
    }
    return null;
  }

  const args = buildSuggestCommandArgs(directory, usedCommands, generation);

  try {
    const { stdout } = await execFileAsync(executable, args, { windowsHide: true, maxBuffer: 1024 * 1024 });
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      console.warn("[quickshell] Suggest CLI returned invalid JSON.");
      return null;
    }

    const response = parseSuggestionResponse(parsed);
    if (!response) {
      console.warn("[quickshell] Suggest CLI returned an unexpected payload shape.");
      return null;
    }

    if (response.generation !== generation) {
      console.warn(`[quickshell] Suggest CLI generation mismatch (wanted ${generation}, got ${response.generation}).`);
      return null;
    }

    return response;
  } catch (error) {
    if (isExpectedSuggestExecFailure(error)) {
      console.warn(
        `[quickshell] Suggest CLI failed (${formatSuggestExecFailure(error)}). Falling back to local heuristics.`,
      );
      return null;
    }
    throw error;
  }
}

/** Prefer Suggest.exe pills; fall back to local folder heuristics when the CLI is missing. */
export async function resolveWorkspaceSetupSuggestions(
  directory: string,
  usedCommands: string[] = [],
  generation = Date.now(),
  assetsPath?: string,
): Promise<WorkspaceSuggestionResult> {
  const trimmed = directory.trim();
  if (!trimmed) {
    return { source: "local", tasks: [], pills: [] };
  }

  // Fire-and-forget form callers must not see unhandled rejections from unexpected Suggest failures.
  try {
    const response = await fetchSuggestionPills(trimmed, usedCommands, generation, assetsPath);
    if (response && response.pills.length > 0) {
      const split = splitPillsIntoSeedAndLeftover(response.pills);
      return {
        source: "suggest",
        tasks: split.tasks,
        pills: split.leftoverPills,
      };
    }
  } catch (error) {
    const kind = error instanceof Error ? error.name : "unknown";
    console.warn(`[quickshell] Suggest resolution failed unexpectedly (${kind}); using local heuristics.`);
  }

  const tasks = buildProjectSetupSuggestions(trimmed);
  const asPills: SuggestionPill[] = tasks.map((task) => ({
    command: task.command,
    taskType: task.taskType?.trim() || "none",
    typeTitle: task.taskType?.trim() || "Setup",
    displayTitle: task.label,
    tooltip: task.command,
  }));
  const split = splitPillsIntoSeedAndLeftover(asPills, LOCAL_SETUP_SEED_TASKS);
  return { source: "local", tasks: split.tasks, pills: split.leftoverPills };
}
