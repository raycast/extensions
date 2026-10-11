import { getPreferenceValues } from "@raycast/api";
import { execFile, execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function isHandyRunning(): boolean {
  try {
    execFileSync("/usr/bin/pgrep", ["-i", "-x", "handy"]);
    return true;
  } catch {
    return false;
  }
}

export async function runHandy(argument: "--toggle-transcription" | "--toggle-post-process" | "--cancel") {
  const binary = preferences().handyBinaryPath.trim();
  if (!binary) throw new Error("Set the Handy Binary Path in this extension's preferences.");
  try {
    await access(binary);
  } catch {
    throw new Error(`Handy was not found at ${binary}. Check the extension preferences.`);
  }
  await execFileAsync(binary, [argument], { timeout: 10_000 });
}
