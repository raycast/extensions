import { open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  carbonShortcutToAppleScript,
  type CarbonShortcut,
} from "./carbon-keys";

export const BUNDLE_ID = "com.sattlerjoshua.BetterCapture";
export const APP_NAME = "BetterCapture";
const APP_PATH = `/Applications/${APP_NAME}.app`;
const PREFS_DOMAIN = BUNDLE_ID;
const DEFAULT_RECORDINGS_DIR = join(homedir(), "Movies", "BetterCapture");
const LAUNCH_DELAY_MS = 500;

export class BetterCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BetterCaptureError";
  }
}

export function isBetterCaptureInstalled(): boolean {
  return existsSync(APP_PATH);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBetterCaptureRunning(): boolean {
  try {
    execSync("pgrep -x BetterCapture", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function ensureBetterCaptureRunning(): Promise<void> {
  if (isBetterCaptureRunning()) {
    return;
  }

  execSync(`open -a ${APP_NAME}`);
  await sleep(LAUNCH_DELAY_MS);
}

export function supportsUrlScheme(): boolean {
  if (!isBetterCaptureInstalled()) {
    return false;
  }

  try {
    const output = execSync(
      `/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes:0:CFBundleURLSchemes:0" "${APP_PATH}/Contents/Info.plist"`,
      { encoding: "utf8" },
    ).trim();
    return output === "bettercapture";
  } catch {
    return false;
  }
}

export function readShortcut(name: string): CarbonShortcut | undefined {
  const key = `KeyboardShortcuts_${name}`;

  try {
    const raw = execSync(`defaults read ${PREFS_DOMAIN} ${key}`, {
      encoding: "utf8",
    }).trim();
    const parsed = JSON.parse(raw) as CarbonShortcut;

    if (
      typeof parsed.carbonKeyCode !== "number" ||
      typeof parsed.carbonModifiers !== "number"
    ) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

export async function relayShortcut(name: string): Promise<void> {
  const shortcut = readShortcut(name);

  if (!shortcut) {
    throw new BetterCaptureError(
      "No BetterCapture shortcut configured. Open BetterCapture → Settings → Shortcuts and set Toggle Recording.",
    );
  }

  const action = carbonShortcutToAppleScript(shortcut);
  const script = `
    tell application "System Events"
      ${action}
    end tell
  `;

  try {
    await runAppleScript(script);
  } catch {
    throw new BetterCaptureError(
      "Failed to send shortcut. Grant Raycast Accessibility access in System Settings → Privacy & Security → Accessibility.",
    );
  }
}

export function getRecordingsDirectory(): string {
  return DEFAULT_RECORDINGS_DIR;
}

export async function openRecordingsFolder(): Promise<void> {
  const directory = getRecordingsDirectory();
  mkdirSync(directory, { recursive: true });
  execSync(`open "${directory}"`);
}

export async function toggleRecording(): Promise<void> {
  if (!isBetterCaptureInstalled()) {
    throw new BetterCaptureError(
      "BetterCapture is not installed. Install it from https://bettercapture.app or run: brew install bettercapture",
    );
  }

  if (supportsUrlScheme()) {
    await open("bettercapture://toggle");
    return;
  }

  await ensureBetterCaptureRunning();
  await relayShortcut("toggleRecording");
}

export async function openRecordings(): Promise<void> {
  if (!isBetterCaptureInstalled()) {
    throw new BetterCaptureError(
      "BetterCapture is not installed. Install it from https://bettercapture.app or run: brew install bettercapture",
    );
  }

  if (supportsUrlScheme()) {
    await open("bettercapture://open-recordings");
    return;
  }

  await openRecordingsFolder();
}
