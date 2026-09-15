import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues, open, type Application } from "@raycast/api";
import { findCompanion } from "./companion";
import { parseSnapshot } from "./protocol";
import type { Mutation, Snapshot } from "./protocol";

const execute = promisify(execFile);

async function companion() {
  const preferences = getPreferenceValues<{ companionPath?: Application }>();
  return findCompanion(preferences.companionPath?.path);
}

export async function request(args: ["list"] | Mutation): Promise<Snapshot> {
  const { executable } = await companion();
  try {
    const { stdout } = await execute(executable, ["--cli", ...args], {
      timeout: 8000,
      maxBuffer: 8 * 1024 * 1024,
      encoding: "utf8",
    });
    return parseSnapshot(stdout);
  } catch (error) {
    const failure = error as Error & { stderr?: string; killed?: boolean };
    if (failure.killed) {
      throw new Error(
        "The save could not be confirmed in time. Refresh before adding it again.",
      );
    }
    throw new Error(
      failure.stderr?.trim() ||
        failure.message ||
        "Could not communicate with super todo.",
    );
  }
}

export async function openCompanion(): Promise<void> {
  const { app } = await companion();
  await open(app);
}
