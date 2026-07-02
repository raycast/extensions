import { execFileSync } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { getPreferenceValues } from "@raycast/api";
import type { KittyOSWindow } from "./types";

const TIMEOUT = 5000;

const KITTEN_CANDIDATES = [
  "/Applications/kitty.app/Contents/MacOS/kitten",
  `${homedir()}/Applications/kitty.app/Contents/MacOS/kitten`,
  "/opt/homebrew/bin/kitten",
  "/usr/local/bin/kitten",
];

let detectedKittenPath: string | undefined;

function resolveKittenPath(): string {
  const { kittenPath } = getPreferenceValues<Preferences>();
  if (kittenPath && existsSync(kittenPath)) {
    return kittenPath;
  }

  if (detectedKittenPath) return detectedKittenPath;

  try {
    const p = execFileSync("which", ["kitten"], { encoding: "utf-8", timeout: 2000 }).trim();
    if (p && existsSync(p)) {
      detectedKittenPath = p;
      return detectedKittenPath;
    }
  } catch {
    // not in PATH, try known locations
  }

  for (const candidate of KITTEN_CANDIDATES) {
    if (existsSync(candidate)) {
      detectedKittenPath = candidate;
      return detectedKittenPath;
    }
  }

  throw new Error("kitten not found — set the path in the Kitten Path extension preference");
}

function findKittySocket(): string | undefined {
  try {
    return readdirSync("/tmp")
      .filter((f) => f.startsWith("kitty-socket-"))
      .map((f) => `/tmp/${f}`)
      .find((p) => statSync(p).isSocket());
  } catch {
    return undefined;
  }
}

export function getSocketPath(): string {
  const { socketPath } = getPreferenceValues<Preferences>();
  if (socketPath) return socketPath;
  return findKittySocket() || "/tmp/kitty-socket";
}

export function runKittenCommand(args: string[]): string {
  const socket = getSocketPath();
  return execFileSync(resolveKittenPath(), ["@", "--to", `unix:${socket}`, ...args], {
    encoding: "utf-8",
    timeout: TIMEOUT,
  }).trim();
}

export function isKittyRunning(): boolean {
  try {
    execFileSync("pgrep", ["-f", "kitty.app/Contents/MacOS/kitty"], {
      encoding: "utf-8",
      timeout: 3000,
    });
    return true;
  } catch {
    return false;
  }
}

export function isSocketAvailable(): boolean {
  return existsSync(getSocketPath());
}

export function activateKitty(): void {
  execFileSync("osascript", ["-e", 'tell application "kitty" to activate'], { timeout: 3000 });
}

export function launchKittyApp(args?: string[]): void {
  const cmd = ["-a", "kitty"];
  if (args?.length) cmd.push("--args", ...args);
  execFileSync("open", cmd, { timeout: 5000 });
}

export async function ensureKittyRunning(): Promise<void> {
  if (!isKittyRunning()) {
    launchKittyApp();
    // Wait for Kitty to start and create the socket
    await new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (isKittyRunning() && isSocketAvailable()) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 20) {
          clearInterval(interval);
          reject(new Error("Kitty did not start in time"));
        }
      }, 250);
    });
  }
}

export function launchWindow(opts?: { cwd?: string; title?: string }): number {
  const args = ["launch", "--type=os-window"];
  if (opts?.cwd) args.push(`--cwd=${opts.cwd}`);
  if (opts?.title) args.push(`--title=${opts.title}`);
  const result = runKittenCommand(args);
  return parseInt(result, 10);
}

export function launchTab(opts?: { cwd?: string; title?: string }): number {
  const args = ["launch", "--type=tab"];
  if (opts?.cwd) args.push(`--cwd=${opts.cwd}`);
  if (opts?.title) args.push(`--tab-title=${opts.title}`);
  const result = runKittenCommand(args);
  return parseInt(result, 10);
}

export function launchSplit(direction: "vsplit" | "hsplit", opts?: { cwd?: string }): number {
  const args = ["launch", `--location=${direction}`];
  if (opts?.cwd) args.push(`--cwd=${opts.cwd}`);
  const result = runKittenCommand(args);
  return parseInt(result, 10);
}

export function listAll(): KittyOSWindow[] {
  const result = runKittenCommand(["ls"]);
  return JSON.parse(result) as KittyOSWindow[];
}

export function focusTab(tabId: number): void {
  runKittenCommand(["focus-tab", `--match=id:${tabId}`]);
}

export function focusWindow(windowId: number): void {
  runKittenCommand(["focus-window", `--match=id:${windowId}`]);
}

export function sendText(windowId: number, text: string): void {
  runKittenCommand(["send-text", `--match=id:${windowId}`, `${text}\n`]);
}

export function closeTab(tabId: number): void {
  runKittenCommand(["close-tab", `--match=id:${tabId}`]);
}

export function setTabTitle(tabId: number, title: string): void {
  runKittenCommand(["set-tab-title", `--match=id:${tabId}`, title]);
}

export function gotoLayout(layout: string): void {
  runKittenCommand(["goto-layout", layout]);
}

export type KittyError = "not_running" | "no_socket" | "remote_disabled" | "timeout" | "unknown";

export function classifyError(error: unknown): KittyError {
  if (!isKittyRunning()) return "not_running";
  if (!isSocketAvailable()) return "no_socket";

  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("ETIMEDOUT") || msg.includes("timed out")) return "timeout";
  if (msg.includes("Permission denied") || msg.includes("remote control")) return "remote_disabled";
  return "unknown";
}
