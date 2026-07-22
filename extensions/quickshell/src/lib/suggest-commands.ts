import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { buildProjectSetupSuggestions, type WorkspaceSetupTask } from "./project-setup-suggestion";

const execFileAsync = promisify(execFile);

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

export function resolveSuggestExecutable(): string | null {
  const fromEnv = process.env.QUICKSHELL_SUGGEST_EXE?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const packaged = path.join(__dirname, "..", "..", "bin", "QuickShell.Suggest.exe");
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
    });
  }
  return tasks;
}

export async function fetchSuggestionPills(
  directory: string,
  usedCommands: string[],
  generation: number,
): Promise<SuggestionResponse | null> {
  const executable = resolveSuggestExecutable();
  if (!executable || !existsSync(executable)) {
    return null;
  }

  const args = buildSuggestCommandArgs(directory, usedCommands, generation);

  try {
    const { stdout } = await execFileAsync(executable, args, { windowsHide: true, maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(stdout) as SuggestionResponse;
    if (parsed.generation !== generation) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/** Prefer Suggest.exe pills; fall back to local folder heuristics when the CLI is missing. */
export async function resolveWorkspaceSetupSuggestions(
  directory: string,
  usedCommands: string[] = [],
  generation = Date.now(),
): Promise<WorkspaceSuggestionResult> {
  const trimmed = directory.trim();
  if (!trimmed) {
    return { source: "local", tasks: [], pills: [] };
  }

  const response = await fetchSuggestionPills(trimmed, usedCommands, generation);
  if (response && response.pills.length > 0) {
    return {
      source: "suggest",
      tasks: pillsToSetupTasks(response.pills),
      pills: response.pills,
    };
  }

  const tasks = buildProjectSetupSuggestions(trimmed);
  return { source: "local", tasks, pills: [] };
}
