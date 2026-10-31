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

/**
 * Runs the CLI. A non-zero exit isn't thrown: it says what happened
 * (1 failed or still running, 2 nothing matched, 3 pinned or a database).
 */
export async function ramback(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const path = places.find((place) => existsSync(place));
  if (!path) throw new Error("Install Ramback from ramback.app.");
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
