import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { promisify } from "node:util";
import { exitCodeMessage, parseApps, parsePCs, parseStatus, parseStop } from "./contract";
import type { App, PC, StopResult } from "./contract";

const execute = promisify(execFile);
const executablePaths = [
  "/usr/local/bin/glimmer",
  "/opt/homebrew/bin/glimmer",
  "/Applications/Glimmer.app/Contents/MacOS/Glimmer",
];

export const DOWNLOAD_URL = "https://github.com/Se7enbrc/glimmer/releases/latest";
export const HOMEBREW_COMMAND =
  "brew tap se7enbrc/glimmer && brew trust --tap se7enbrc/glimmer && brew install --cask glimmer";

export class MissingCLIError extends Error {
  constructor() {
    super("Install Glimmer, then choose Glimmer › Install Command Line Tool…");
    this.name = "MissingCLIError";
  }
}

export async function findCLI(): Promise<string> {
  for (const path of executablePaths) {
    try {
      await access(path, constants.X_OK);
      return path;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") {
        throw new Error("Glimmer’s command could not be accessed. Check its installation and permissions.");
      }
      // Try the next documented installation location.
    }
  }
  throw new MissingCLIError();
}

async function run(
  args: string[],
  pc?: string,
  timeout = 120_000,
  acceptedExitCodes: number[] = [],
): Promise<{ stdout: string; exitCode: number }> {
  const executable = await findCLI();
  try {
    const { stdout } = await execute(executable, args, {
      encoding: "utf8",
      timeout,
      maxBuffer: 8 * 1024 * 1024,
      // Argument arrays keep PC names and app names out of a shell.
      shell: false,
    });
    return { stdout, exitCode: 0 };
  } catch (error) {
    const failure = error as { code?: number | string; killed?: boolean; stdout?: string };
    if (failure.code === "ENOENT") throw new MissingCLIError();
    if (failure.killed) throw new Error("Glimmer took too long to answer. Open Glimmer and try again.");
    if (typeof failure.code === "number" && acceptedExitCodes.includes(failure.code)) {
      return { stdout: failure.stdout ?? "", exitCode: failure.code };
    }
    // Do not expose arbitrary stderr, which can include protocol details.
    throw new Error(exitCodeMessage(typeof failure.code === "number" ? failure.code : null, pc));
  }
}

export async function listPCs(): Promise<PC[]> {
  return parsePCs((await run(["list", "--json"])).stdout).filter((pc) => pc.paired);
}

export async function readStatus() {
  return parseStatus((await run(["status", "--json"], undefined, 15_000)).stdout);
}

export async function listApps(pcID: string, pcName: string): Promise<App[]> {
  return parseApps((await run(["list", pcID, "--json"], pcName)).stdout);
}

export async function wakePC(pc: PC): Promise<void> {
  // Glimmer waits up to 90 seconds. Allow extra time for startup and teardown.
  await run(["wake", pc.id, "--wait"], pc.name);
}

export async function streamPC(pc: PC, app?: string): Promise<void> {
  // No --force: an occupied session must be resolved in Glimmer.
  await run(["stream", pc.id, ...(app === undefined ? [] : [app])], pc.name);
}

export async function stopLiveStream(): Promise<StopResult> {
  // The CLI waits up to 15 seconds for a reply; allow startup and teardown time.
  const { stdout, exitCode } = await run(["stop", "--json"], undefined, 20_000, [5]);
  return parseStop(stdout, exitCode);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Glimmer couldn’t complete the request. Try again.";
}
