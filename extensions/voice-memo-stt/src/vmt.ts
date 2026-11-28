import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { describeFailure, VmtError } from "./errors";
import type { Recording } from "./types";

const run = promisify(execFile);

/**
 * Raycast launches commands with a bare environment, so a login shell's PATH is
 * not available and `vmt` has to be found where Homebrew puts it.
 */
const CANDIDATE_PATHS = ["/opt/homebrew/bin/vmt", "/usr/local/bin/vmt"];

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveVmt(): string {
  const { vmtPath } = getPreferenceValues<Preferences>();
  const configured = vmtPath?.trim();
  if (configured) {
    if (!isExecutable(configured)) {
      throw new VmtError(
        "vmt not found at the configured path",
        `${configured} is not an executable file. Fix it in the extension preferences (⌘,).`,
      );
    }
    return configured;
  }

  const found = CANDIDATE_PATHS.find(isExecutable);
  if (!found) {
    throw new VmtError(
      "vmt is not installed",
      "Install it with `brew install matsubo/tap/vmt`, or set the path in the extension preferences (⌘,).",
    );
  }
  return found;
}

async function vmt(args: string[], timeoutMs: number): Promise<string> {
  const bin = resolveVmt();
  try {
    const { stdout } = await run(bin, args, { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    const stderr = typeof error === "object" && error && "stderr" in error ? String(error.stderr) : "";
    throw describeFailure(args[0], stderr);
  }
}

export async function listRecordings(): Promise<Recording[]> {
  const stdout = await vmt(["list", "--json"], 30_000);
  return JSON.parse(stdout) as Recording[];
}

/**
 * Transcription is a network round trip over the whole audio file, so it gets a
 * long leash — an hour of audio takes minutes. `overwrite` is required to
 * transcribe an already transcribed recording again; vmt refuses otherwise.
 */
export async function transcribe(recordingPath: string, { overwrite = false } = {}): Promise<void> {
  const args = ["transcribe", recordingPath, "--yes"];
  if (overwrite) {
    args.push("--overwrite");
  }
  await vmt(args, 30 * 60_000);
}
