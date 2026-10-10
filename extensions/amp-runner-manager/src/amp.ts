import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type RunnerDirectory = {
  path: string;
  repositoryURL: string | null;
  canCreateWorktree: boolean;
};

export type Runner = {
  runnerId: string;
  workingDirectory: string;
  serveCwd: boolean;
  directories: RunnerDirectory[];
};

export function getServedDirectories(
  runner: Runner,
): (RunnerDirectory & { removable: boolean })[] {
  const directories = runner.directories.map((directory) => ({
    ...directory,
    removable: !(runner.serveCwd && directory.path === runner.workingDirectory),
  }));

  if (
    runner.serveCwd &&
    !directories.some((directory) => directory.path === runner.workingDirectory)
  ) {
    directories.unshift({
      path: runner.workingDirectory,
      repositoryURL: null,
      canCreateWorktree: false,
      removable: false,
    });
  }

  return directories;
}

export function expandHome(path: string): string {
  return path === "~" ? homedir() : path.replace(/^~\//, `${homedir()}/`);
}

export function displayPath(path: string): string {
  const home = homedir();
  return path === home
    ? "~"
    : path.startsWith(`${home}/`)
      ? `~/${path.slice(home.length + 1)}`
      : path;
}

export function parseRunnerList(output: string): Runner[] {
  let value: unknown;
  try {
    value = JSON.parse(output);
  } catch {
    throw new Error("Amp returned invalid JSON");
  }

  const runners = (value as { runners?: unknown })?.runners;
  if (!Array.isArray(runners))
    throw new Error("Amp returned an unexpected runner list");

  return runners.map((runner) => {
    if (!runner || typeof runner !== "object")
      throw new Error("Amp returned an invalid runner");
    const item = runner as Record<string, unknown>;
    if (
      typeof item.runnerId !== "string" ||
      typeof item.workingDirectory !== "string" ||
      typeof item.serveCwd !== "boolean" ||
      !Array.isArray(item.directories)
    ) {
      throw new Error("Amp returned an invalid runner");
    }

    const directories = item.directories.map((directory) => {
      if (!directory || typeof directory !== "object")
        throw new Error("Amp returned an invalid directory");
      const entry = directory as Record<string, unknown>;
      if (
        typeof entry.path !== "string" ||
        (entry.repositoryURL !== null &&
          typeof entry.repositoryURL !== "string") ||
        typeof entry.canCreateWorktree !== "boolean"
      ) {
        throw new Error("Amp returned an invalid directory");
      }
      return {
        path: entry.path,
        repositoryURL: entry.repositoryURL,
        canCreateWorktree: entry.canCreateWorktree,
      };
    });

    return {
      runnerId: item.runnerId,
      workingDirectory: item.workingDirectory,
      serveCwd: item.serveCwd,
      directories,
    };
  });
}

async function runAmp(ampPath: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(expandHome(ampPath), args, {
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1" },
    });
    return stdout;
  } catch (error) {
    const failure = error as Error & { stderr?: string };
    const detail = failure.stderr?.trim();
    throw new Error(detail || failure.message || "Amp command failed");
  }
}

// Check permissions before activating Amp so Raycast stays open to show the
// failure toast and its settings action.
const OPEN_RUNNER_SETTINGS_SCRIPT = `
tell application "System Events" to set canScript to UI elements enabled
if not canScript then error "Raycast is not allowed assistive access." number -25211
tell application id "com.ampcode.amp.macos" to activate
tell application "System Events" to tell process "Amp"
  repeat 50 times
    if exists menu bar item "Amp" of menu bar 1 then exit repeat
    delay 0.1
  end repeat
  click menu item "App Settings…" of menu 1 of menu bar item "Amp" of menu bar 1
  repeat 50 times
    if exists button "Runner" of toolbar 1 of front window then exit repeat
    delay 0.1
  end repeat
  click button "Runner" of toolbar 1 of front window
end tell
`;

export type MissingPermission = "accessibility" | "automation";

export const PRIVACY_SETTINGS_URLS: Record<MissingPermission, string> = {
  accessibility:
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  automation:
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
};

export function missingPermission(message: string): MissingPermission | null {
  if (/-25211|-1719|not allowed assistive access/i.test(message))
    return "accessibility";
  if (/-1743|not authori[sz]ed to send apple events/i.test(message))
    return "automation";
  return null;
}

export async function openRunnerSettings(): Promise<void> {
  try {
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      OPEN_RUNNER_SETTINGS_SCRIPT,
    ]);
  } catch (error) {
    const failure = error as Error & { stderr?: string };
    throw new Error(
      failure.stderr?.trim() || failure.message || "osascript failed",
    );
  }
}

export async function listRunners(ampPath: string): Promise<Runner[]> {
  return parseRunnerList(await runAmp(ampPath, ["runner", "list", "--json"]));
}

export async function addDirectory(
  ampPath: string,
  runnerId: string,
  path: string,
): Promise<void> {
  await runAmp(ampPath, [
    "runner",
    "dirs",
    "add",
    path,
    "--runner-id",
    runnerId,
  ]);
}

export async function removeDirectory(
  ampPath: string,
  runnerId: string,
  path: string,
): Promise<void> {
  await runAmp(ampPath, [
    "runner",
    "dirs",
    "remove",
    path,
    "--runner-id",
    runnerId,
  ]);
}
