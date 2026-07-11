import { WORKTREE_CONFIG_FILE } from "#/config/constants";
import { executeShellCommand } from "#/helpers/general";
import { confirmAlert } from "@raycast/api";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { shellEnv } from "shell-env";
import { getLocalWorktrees } from "./git";
import { getPreferences } from "./raycast";

export interface WorktreeConfig {
  "setup-worktree"?: string[];
}

export interface CommandResult {
  command: string;
  success: boolean;
  error?: string;
}

export interface WorktreeEnvVars {
  RECENT_WORKTREE_PATH: string | null;
}

/**
 * Reads and parses the worktree config file from a bare repository
 * @param bareRepoPath - Path to the bare repository
 * @returns The parsed config or null if not found
 */
export const getWorktreeConfig = async (bareRepoPath: string): Promise<WorktreeConfig | null> => {
  const configPath = path.join(bareRepoPath, WORKTREE_CONFIG_FILE);

  try {
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content) as WorktreeConfig;
  } catch {
    return null;
  }
};

/**
 * Saves the worktree config file to a bare repository
 * @param bareRepoPath - Path to the bare repository
 * @param config - The config object to save
 */
export const saveWorktreeConfig = async (bareRepoPath: string, config: WorktreeConfig): Promise<void> => {
  const configPath = path.join(bareRepoPath, WORKTREE_CONFIG_FILE);
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
};

/**
 * Gets the most recently created worktree path (excluding current and bare)
 * @param bareRepoPath - Path to the bare repository
 * @param excludePath - Path to exclude (the newly created worktree)
 * @returns The most recent worktree path or null
 */
export const getMostRecentWorktreePath = async (bareRepoPath: string, excludePath: string): Promise<string | null> => {
  try {
    const worktrees = await getLocalWorktrees({ path: bareRepoPath, includeBare: false, showCurrentWorktree: true });

    // Filter out the newly created worktree
    const otherWorktrees = worktrees.filter((wt) => wt.path !== excludePath);

    if (otherWorktrees.length === 0) return null;

    // Get modification times for each worktree
    const worktreesWithStats = await Promise.all(
      otherWorktrees.map(async (wt) => {
        try {
          const stats = await stat(wt.path);
          return { path: wt.path, mtime: stats.mtime.getTime() };
        } catch {
          return { path: wt.path, mtime: 0 };
        }
      }),
    );

    // Sort by modification time (most recent first)
    worktreesWithStats.sort((a, b) => b.mtime - a.mtime);

    return worktreesWithStats[0]?.path ?? null;
  } catch {
    return null;
  }
};

/**
 * Builds environment variables for setup commands
 * @param bareRepoPath - Path to the bare repository
 * @param newWorktreePath - Path to the newly created worktree
 * @returns Environment variables object
 */
export const buildWorktreeEnvVars = async (bareRepoPath: string, newWorktreePath: string): Promise<WorktreeEnvVars> => {
  const recentWorktreePath = await getMostRecentWorktreePath(bareRepoPath, newWorktreePath);

  return {
    RECENT_WORKTREE_PATH: recentWorktreePath,
  };
};

/**
 * Replaces environment variables in a command string
 * @param command - The command string with $VAR placeholders
 * @param envVars - Environment variables to substitute
 * @returns The command with variables replaced
 */
export const substituteEnvVars = (command: string, envVars: WorktreeEnvVars): string => {
  let result = command;

  if (envVars.RECENT_WORKTREE_PATH) {
    result = result.replace(/\$RECENT_WORKTREE_PATH/g, envVars.RECENT_WORKTREE_PATH);
  }

  return result;
};

/**
 * Runs setup commands sequentially in the worktree directory
 * @param options - Configuration options for running commands
 * @returns Array of command results
 */
export const runSetupCommands = async ({
  commands,
  worktreePath,
  envVars,
  onCommandStart,
  onCommandComplete,
  onCommandError,
}: {
  commands: string[];
  worktreePath: string;
  envVars: WorktreeEnvVars;
  onCommandStart?: (command: string, index: number, total: number) => void;
  onCommandComplete?: (command: string, index: number, total: number) => void;
  onCommandError?: (command: string, error: string, index: number, total: number) => Promise<boolean>;
}): Promise<CommandResult[]> => {
  const results: CommandResult[] = [];
  const { commandTimeoutSeconds } = getPreferences();
  const timeoutSeconds = +commandTimeoutSeconds || 30;
  const timeoutMs = timeoutSeconds * 1000;

  for (let i = 0; i < commands.length; i++) {
    const rawCommand = commands[i];
    const command = substituteEnvVars(rawCommand, envVars);

    onCommandStart?.(command, i, commands.length);

    try {
      // Use execa with shell option for proper environment loading
      // This ensures tools like pnpm, ni, nvm-managed node, etc. work
      const shellEnvVars = await shellEnv();

      await executeShellCommand(command, { cwd: worktreePath, timeout: timeoutMs, env: shellEnvVars });

      results.push({ command, success: true });
      onCommandComplete?.(command, i, commands.length);
    } catch (e: unknown) {
      let errorMessage = e instanceof Error ? e.message : "Unknown error occurred";

      // Check for timeout error (execa uses 'timedOut' property)
      if (e && typeof e === "object" && "timedOut" in e && e.timedOut) {
        errorMessage = `Command timed out after ${timeoutSeconds} seconds`;
      } else if (e && typeof e === "object" && "stderr" in e && e.stderr) {
        errorMessage = String(e.stderr);
      }

      results.push({ command, success: false, error: errorMessage });

      if (onCommandError) {
        const shouldContinue = await onCommandError(command, errorMessage, i, commands.length);
        if (!shouldContinue) break;
      } else {
        break;
      }
    }
  }

  return results;
};

/**
 * Checks if setup commands should be run based on user preference
 * @param options - Configuration options
 * @returns Whether to run setup commands
 */
export const shouldRunSetupCommands = async ({
  bareRepoPath,
  onAccept,
}: {
  bareRepoPath: string;
  onAccept?: () => void;
}): Promise<{ shouldRun: boolean; commands: string[] }> => {
  const { shouldRunWorktreeSetupCommands } = getPreferences();

  if (shouldRunWorktreeSetupCommands === "no") {
    return { shouldRun: false, commands: [] };
  }

  const config = await getWorktreeConfig(bareRepoPath);

  if (!config?.["setup-worktree"] || config["setup-worktree"].length === 0) {
    return { shouldRun: false, commands: [] };
  }

  const commands = config["setup-worktree"];

  if (shouldRunWorktreeSetupCommands === "ask") {
    const confirmed = await confirmAlert({
      title: "Run Setup Commands?",
      message: `Found ${commands.length} setup command${commands.length > 1 ? "s" : ""} in config. Do you want to run them?`,
    });

    if (!confirmed) {
      return { shouldRun: false, commands: [] };
    }
  }

  onAccept?.();

  return { shouldRun: true, commands };
};
