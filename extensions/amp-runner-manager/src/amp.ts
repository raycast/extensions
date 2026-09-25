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
