import { environment } from "@raycast/api";
import { execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export class AccessibilityError extends Error {
  constructor(message = "Raycast needs Accessibility permission to list and focus windows.") {
    super(message);
    this.name = "AccessibilityError";
  }
}

export type AppWindow = {
  appName: string;
  bundleId: string;
  unixId: number;
  title: string;
  index: number;
  minimized: boolean;
  appPath?: string;
  localizedName?: string;
  width?: number;
  height?: number;
  windowId?: number;
  thumbnail?: string | null;
};

function helperPath(): string {
  return join(environment.assetsPath, "lost-windows");
}

function execErrorText(error: unknown): string {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  const execError = error as { message?: string; stderr?: string; stdout?: string };
  return [execError.stderr, execError.stdout, execError.message].filter(Boolean).join("\n");
}

async function runHelper(args: string[] = []): Promise<string> {
  const path = helperPath();
  if (!existsSync(path)) {
    throw new Error(`Window helper missing at ${path}. Run npm run build:swift.`);
  }

  try {
    const { stdout } = await execFileAsync(path, args, {
      timeout: args[0] === "thumb" ? 2500 : 8000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    const text = execErrorText(error);
    throw new Error(text || "Could not read windows from macOS.");
  }
}

export async function listWindows(): Promise<AppWindow[]> {
  const rawOutput = await runHelper();
  if (!rawOutput) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawOutput) as AppWindow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("Could not read the window list from macOS.");
  }
}

export async function captureThumbnail(windowId: number): Promise<string | undefined> {
  if (!windowId) {
    return undefined;
  }

  try {
    const rawOutput = await runHelper(["thumb", String(windowId)]);
    if (!rawOutput) {
      return undefined;
    }
    const parsed = JSON.parse(rawOutput) as { thumbnail?: string | null };
    return parsed.thumbnail || undefined;
  } catch {
    return undefined;
  }
}

export type FrontWindow = {
  appName: string;
  bundleId: string;
  unixId: number;
  windowId: number;
};

export async function getFrontWindow(): Promise<FrontWindow | undefined> {
  const rawOutput = await runHelper(["front"]);
  if (!rawOutput || rawOutput === "null") {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawOutput) as FrontWindow | null;
    return parsed?.windowId ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function focusWindow(window: AppWindow): Promise<void> {
  const path = helperPath();
  if (!existsSync(path)) {
    throw new Error(`Window helper missing at ${path}. Run npm run build:swift.`);
  }
  if (!window.unixId) {
    throw new Error("Couldn't focus window: the app is no longer running.");
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(path, ["focus", String(window.unixId), String(window.windowId ?? 0), window.title], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail =
        stderr.trim() || `Window helper exited with code ${code ?? "null"}${signal ? ` (signal: ${signal})` : ""}`;
      reject(new Error(detail));
    });
  });
}

export const ACCESSIBILITY_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

export const SCREEN_RECORDING_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";
