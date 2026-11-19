import { showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULTS_PATH = "/usr/bin/defaults";
const DOMAIN = "com.apple.AppleMultitouchTrackpad";
const KEY = "USBMouseStopsTrackpad";
const ACTIVATE_SETTINGS_PATH =
  "/System/Library/PrivateFrameworks/SystemAdministration.framework/Resources/activateSettings";

type TrackpadSetting = 0 | 1;

function isMissingPreferenceError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === 1 &&
    "stderr" in error &&
    typeof error.stderr === "string" &&
    error.stderr.includes(`(${DOMAIN}, ${KEY}) does not exist`)
  );
}

async function readCurrentState(): Promise<TrackpadSetting> {
  try {
    const { stdout } = await execFileAsync(DEFAULTS_PATH, ["read", DOMAIN, KEY]);
    const value = stdout.trim();

    if (value !== "0" && value !== "1") {
      throw new Error(`Unexpected ${KEY} value: ${JSON.stringify(value)}`);
    }

    return value === "1" ? 1 : 0;
  } catch (error) {
    if (isMissingPreferenceError(error)) {
      return 0;
    }

    throw error;
  }
}

async function writeState(value: TrackpadSetting): Promise<void> {
  await execFileAsync(DEFAULTS_PATH, ["write", DOMAIN, KEY, "-int", String(value)]);
}

async function activateSettings(): Promise<void> {
  await access(ACTIVATE_SETTINGS_PATH);
  await execFileAsync(ACTIVATE_SETTINGS_PATH, ["-u"]);
}

async function restoreState(previous: TrackpadSetting): Promise<void> {
  try {
    await writeState(previous);
    await activateSettings();
  } catch (error) {
    console.error("Failed to restore the previous trackpad setting", error);
  }
}

export default async function Command() {
  try {
    const current = await readCurrentState();
    const next: TrackpadSetting = current === 1 ? 0 : 1;

    await writeState(next);

    try {
      await activateSettings();
    } catch (error) {
      await restoreState(current);
      throw error;
    }

    await showHUD(next === 1 ? "🚫 Built-in Trackpad Ignored" : "✅ Built-in Trackpad Available");
  } catch (error) {
    console.error("Failed to toggle the built-in trackpad setting", error);
    await showHUD("❌ Couldn’t toggle the trackpad setting");
  }
}
