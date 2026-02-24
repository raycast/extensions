import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";
import { WindowInfo } from "./types";

// The Swift helper binary lives next to the extension source
const HELPER_NAME = "window-helper";

function getHelperPath(): string {
  // Raycast bundles the assets/ directory — the binary lives there
  const p = path.join(environment.assetsPath, HELPER_NAME);
  if (existsSync(p)) return p;

  throw new HelperNotFoundError();
}

// --- Error classes ---

class HelperNotFoundError extends Error {
  constructor() {
    super(
      "Window helper not found in assets. Run: npm run build-helper && cp swift-helper/window-helper assets/",
    );
    this.name = "HelperNotFoundError";
  }
}

class HelperError extends Error {
  constructor(command: string, stderr: string) {
    super(`Window helper failed: ${command}\n${stderr}`);
    this.name = "HelperError";
  }
}

// --- Low-level execution ---

function execHelper(args: string[]): string {
  const bin = getHelperPath();
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    timeout: 15000,
  });

  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new HelperNotFoundError();
    }
    throw result.error;
  }

  if (result.status !== 0) {
    throw new HelperError(
      `${HELPER_NAME} ${args.join(" ")}`,
      result.stderr || "Unknown error",
    );
  }

  return result.stdout.trim();
}

function execHelperJSON<T>(args: string[]): T {
  const output = execHelper(args);
  return JSON.parse(output) as T;
}

// --- Public API: Window operations ---

/** Raw output from Swift helper (includes position fields we don't need) */
interface RawWindowInfo {
  windowId: number;
  appBundleId: string;
  appName: string;
  windowTitle: string;
  spaceIds: number[];
}

/** Get all windows with their space mappings */
export function getAllWindows(): WindowInfo[] {
  const raw = execHelperJSON<RawWindowInfo[]>(["windows"]);
  return raw.map((w) => ({
    windowId: w.windowId,
    appBundleId: w.appBundleId,
    appName: w.appName,
    windowTitle: w.windowTitle,
    spaceIds: w.spaceIds,
  }));
}

/** Raise a window to front. Tries window ID → title match → bundle ID fallback. */
export function raiseWindow(
  bundleId: string,
  titleMatch: string,
  windowId?: number,
): boolean {
  try {
    const args = [
      "raise-window",
      "--bundle-id",
      bundleId,
      "--title-match",
      titleMatch,
    ];
    if (windowId !== undefined) {
      args.push("--window-id", String(windowId));
    }
    execHelper(args);
    return true;
  } catch {
    return false;
  }
}
