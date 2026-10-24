import type { PermissionMode } from "./session-parser";

export function quotePosixShellArgument(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function buildShellCommandInDirectory(
  command: string,
  cwd: string,
): string {
  return `cd ${quotePosixShellArgument(cwd)} && ${command}`;
}

export function validateRalphOptions(
  task: string,
  maxIterations: number,
): void {
  if (!task.trim()) throw new Error("Ralph Loop requires a task");
  if (
    !Number.isInteger(maxIterations) ||
    maxIterations < 1 ||
    maxIterations > 100
  ) {
    throw new Error("Maximum iterations must be a whole number from 1 to 100");
  }
}

export interface ClaudeLaunchOptions {
  sessionId?: string;
  continueSession?: boolean;
  forkSession?: boolean;
  hasPrompt?: boolean;
  printMode?: boolean;
  worktree?: boolean;
  dangerouslySkipPermissions?: boolean;
  permissionMode?: PermissionMode;
  model?: string;
}

function normalizeModelName(model: string): string {
  if (["fable", "opus", "sonnet", "haiku"].includes(model)) return model;
  if (model.includes("fable")) return "fable";
  if (model.includes("opus")) return "opus";
  if (model.includes("sonnet")) return "sonnet";
  if (model.includes("haiku")) return "haiku";
  return model;
}

export function buildClaudeLaunchArgs(options: ClaudeLaunchOptions): string[] {
  const args: string[] = [];
  if (options.dangerouslySkipPermissions) {
    args.push("--dangerously-skip-permissions");
  }

  if (options.sessionId) {
    args.push("-r", options.sessionId);
    if (options.forkSession) args.push("--fork-session");
  } else if (options.continueSession) {
    args.push("-c");
  } else if (options.worktree) {
    args.push("--worktree");
  }

  if (
    options.permissionMode &&
    options.permissionMode !== "default" &&
    !options.dangerouslySkipPermissions
  ) {
    args.push("--permission-mode", options.permissionMode);
  }

  if (options.model && !options.sessionId && !options.continueSession) {
    args.push("--model", normalizeModelName(options.model));
  }

  if (options.hasPrompt && options.printMode) args.push("-p");
  return args;
}
