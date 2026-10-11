import { execFile } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ACTIONS, ActionID } from "./actions";

const exec = promisify(execFile);
export const BUNDLE_ID = "com.MrKai77.Loop";
export type Request =
  | { kind: "action"; value: ActionID }
  | { kind: "keybind"; value: string }
  | { kind: "list"; value: "all" | "actions" | "keybinds" };
export type Runner = (file: string, args: string[]) => Promise<string>;
export const run: Runner = async (file, args) =>
  (await exec(file, args, { timeout: 10000, maxBuffer: 1024 * 1024 })).stdout;

export function resolveAppPath(value?: string): string {
  const input = value?.trim() || "/Applications/Loop.app";
  const expanded = input.startsWith("~/") ? path.join(homedir(), input.slice(2)) : input;
  if (!path.isAbsolute(expanded) || !expanded.endsWith(".app"))
    throw new Error("Enter the absolute path to Loop.app in extension preferences.");
  return expanded;
}

export function buildURL(request: Request): string {
  if (request.kind === "action" && !ACTIONS.some((action) => action.id === request.value))
    throw new Error("Unsupported Loop action.");
  if (
    request.kind === "keybind" &&
    (!request.value.trim() ||
      [...request.value].some((char) => char === "/" || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
      [".", "..", "list"].includes(request.value.toLowerCase()))
  ) {
    throw new Error(
      "Enter an existing Loop keybind name. Slashes, control characters, and the names ., .., or list are not supported.",
    );
  }
  return `loop://${request.kind}/${encodeURIComponent(request.value)}`;
}

export interface Installation {
  appPath: string;
  version: string;
}
export async function inspectInstallation(value?: string, runner: Runner = run): Promise<Installation> {
  const appPath = resolveAppPath(value);
  let info: {
    CFBundleIdentifier?: string;
    CFBundleShortVersionString?: string;
    CFBundleURLTypes?: { CFBundleURLSchemes?: string[] }[];
  };
  try {
    info = JSON.parse(
      await runner("/usr/bin/plutil", ["-convert", "json", "-o", "-", path.join(appPath, "Contents/Info.plist")]),
    );
  } catch {
    throw new Error(`Cannot read ${appPath}. Install Loop or correct the application path in extension preferences.`);
  }
  if (info.CFBundleIdentifier?.toLowerCase() !== BUNDLE_ID.toLowerCase())
    throw new Error("The selected application is not Loop. Check the application path.");
  if (!info.CFBundleURLTypes?.some((type) => type.CFBundleURLSchemes?.includes("loop")))
    throw new Error("This version does not declare the loop:// URL scheme. Update Loop.");
  return { appPath, version: info.CFBundleShortVersionString || "Unknown" };
}

export async function dispatch(appPath: string, url: string, runner: Runner = run): Promise<void> {
  try {
    // execFile uses argument arrays, never a shell. -g preserves the restored app's focus.
    await runner("/usr/bin/open", ["-g", "-a", appPath, url]);
  } catch (error) {
    throw new Error(
      `Could not send the command to Loop. Open Loop manually, complete its first-run setup, and try again.${error instanceof Error ? ` (${error.message})` : ""}`,
    );
  }
}

export interface DeliveryHooks {
  inspect: () => Promise<Installation>;
  close: () => Promise<void>;
  wait: (ms: number) => Promise<void>;
  send: (appPath: string, url: string) => Promise<void>;
}
export async function deliver(request: Request, delay: number, hooks: DeliveryHooks): Promise<void> {
  const url = buildURL(request);
  const installation = await hooks.inspect();
  await hooks.close();
  await hooks.wait(Number.isFinite(delay) ? Math.max(100, Math.min(delay, 1500)) : 250);
  await hooks.send(installation.appPath, url);
}
