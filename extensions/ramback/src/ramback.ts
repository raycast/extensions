import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

/** Raycast doesn't get the shell's PATH: Homebrew's links first, then the copy inside the app. */
const places = [
  "/opt/homebrew/bin/ramback",
  "/usr/local/bin/ramback",
  "/Applications/Ramback.app/Contents/Helpers/ramback",
];

/** One row of `ramback status --json`; only the fields this extension reads. */
export type Item = {
  id: string;
  kind: string;
  title: string;
  project?: string;
  startedBy?: string;
  memory: number;
  counted: boolean;
  ports: number[];
  /** Absent when Ramback doesn't stop it (agents, the Docker VM). */
  stop?: unknown;
  guarded: boolean;
  building: boolean;
};

export const downloadURL = "https://ramback.app";
export const brewCommand = "brew install --cask heykadirhan/tap/ramback";

/** Thrown when no copy of the CLI is found, so the commands can offer the download instead of a raw error. */
export class NotInstalledError extends Error {
  constructor() {
    super("Install Ramback from ramback.app or with Homebrew, then try again.");
    this.name = "NotInstalledError";
  }
}

export type Result = { code: number; stdout: string; stderr: string };

/**
 * Runs the CLI. A non-zero exit isn't thrown: it says what happened
 * (1 failed or still running, 2 nothing matched, 3 pinned or a database).
 * Throws NotInstalledError when the CLI isn't found, or the spawn error when it can't start.
 */
export async function ramback(...args: string[]): Promise<Result> {
  const path = places.find((place) => existsSync(place));
  if (!path) throw new NotInstalledError();
  try {
    const { stdout, stderr } = await promisify(execFile)(path, args);
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number | string; stdout?: string; stderr?: string };
    if (typeof failure.code !== "number") throw error;
    return { code: failure.code, stdout: failure.stdout ?? "", stderr: failure.stderr ?? "" };
  }
}

export const gb = (bytes: number) => `${(bytes / 1e9).toFixed(1)} GB`;
