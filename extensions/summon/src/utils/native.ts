import { spawnSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";
import { WindowInfo, DisplayInfo } from "./types";

const execFileAsync = promisify(execFile);

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

/** Raw output from Swift helper */
interface RawWindowInfo {
  windowId: number;
  appBundleId: string;
  appName: string;
  windowTitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spaceIds: number[];
  isRegularApp: boolean;
}

/** Get all windows with their space mappings and position data */
export function getAllWindows(): WindowInfo[] {
  const raw = execHelperJSON<RawWindowInfo[]>(["windows"]);
  return raw.map(mapRawWindow);
}

/** Async version of getAllWindows — does not block the event loop. */
export async function getAllWindowsAsync(): Promise<WindowInfo[]> {
  const bin = getHelperPath();
  const { stdout } = await execFileAsync(bin, ["windows"], {
    encoding: "utf8",
    timeout: 15000,
  });
  const raw = JSON.parse(stdout.trim()) as RawWindowInfo[];
  return raw.map(mapRawWindow);
}

function mapRawWindow(w: RawWindowInfo): WindowInfo {
  return {
    windowId: w.windowId,
    appBundleId: w.appBundleId,
    appName: w.appName,
    windowTitle: w.windowTitle,
    spaceIds: w.spaceIds,
    x: w.x,
    y: w.y,
    width: w.width,
    height: w.height,
    isRegularApp: w.isRegularApp,
  };
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

/** Set a window's position and size, then raise it to front. */
export function setWindowFrame(
  bundleId: string,
  titleMatch: string,
  windowId: number | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  try {
    const args = [
      "set-window-frame",
      "--bundle-id",
      bundleId,
      "--title-match",
      titleMatch,
    ];
    if (windowId !== undefined) {
      args.push("--window-id", String(windowId));
    }
    args.push(
      "--x",
      String(x),
      "--y",
      String(y),
      "--width",
      String(width),
      "--height",
      String(height),
    );
    execHelper(args);
    return true;
  } catch {
    return false;
  }
}

/** Launch an app by bundle ID. Returns result with ok status. */
export function launchApp(bundleId: string): {
  ok: boolean;
  alreadyRunning?: boolean;
  pid?: number;
} {
  try {
    return execHelperJSON<{
      ok: boolean;
      alreadyRunning?: boolean;
      pid?: number;
    }>(["launch-app", "--bundle-id", bundleId]);
  } catch {
    return { ok: false };
  }
}

/** Raw display space info from the `list` command */
interface RawDisplaySpace {
  id: number;
  index: number;
  isCurrent: boolean;
  type: number;
}

interface RawDisplayInfo {
  displayId: string;
  displayName: string;
  spaces: RawDisplaySpace[];
}

/** Get current displays with their identifiers. */
export function getDisplays(): DisplayInfo[] {
  const raw = execHelperJSON<RawDisplayInfo[]>(["list"]);
  // Map display info — use NSScreen bounds for position data
  // The list command returns display IDs and names but not bounds directly.
  // We derive bounds from window positions: a display's windows share a coordinate region.
  // For now, return displayId and displayName so we can map windows to monitors.
  return raw.map((d) => ({
    displayId: d.displayId,
    displayName: d.displayName,
    bounds: { x: 0, y: 0, width: 0, height: 0 }, // populated by caller if needed
  }));
}

/**
 * Map a window's position to a display ID by checking which display
 * contains the window's center point. Falls back to "Main" if unknown.
 */
export function windowToDisplayId(
  windowX: number,
  windowY: number,
  windowWidth: number,
  windowHeight: number,
  allWindows: WindowInfo[],
  displays: DisplayInfo[],
): string {
  // Simple heuristic: group all windows by app, find display regions.
  // For multi-monitor, the coordinate system extends: main display starts at (0,0),
  // secondary monitors have negative or offset coordinates.
  // Without NSScreen bounds from Swift, we use the display IDs directly.
  // Just return the first display ID as a reasonable default.
  if (displays.length <= 1) return displays[0]?.displayId ?? "Main";

  // For multi-monitor setups, we can infer which display by checking
  // if the window center is in negative X (left monitor) or large X (right monitor).
  // This is a best-effort mapping.
  const centerX = windowX + windowWidth / 2;

  // Sort displays — "Main" is typically at origin (0,0)
  // Secondary monitors can be left (negative X) or right (positive X past main width)
  // Without exact bounds, return first display as default
  if (centerX < 0) {
    // Likely on a left-positioned secondary monitor
    const secondary = displays.find((d) => d.displayId !== "Main");
    return secondary?.displayId ?? "Main";
  }

  return displays[0]?.displayId ?? "Main";
}
