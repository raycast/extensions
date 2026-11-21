import { getApplications, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const execute = promisify(execFile);
let verifiedExecutable: string | undefined;

export interface DockLockDisplay {
  id: string;
  number: number;
  name: string;
  hardwareName: string;
  allowed: boolean;
  compatible: boolean;
  dockHere: boolean | null;
  geometry: { x: number; y: number; width: number; height: number };
}

export const movementModes = {
  "lock-selected": "Lock to Selected Displays",
  "follows-mouse": "Dock Follows Mouse",
  off: "Turn Off Dock Movement",
} as const;

function cliFailure(detail: string): Error {
  // macOS diagnostics can share stderr with the CLI's single-line JSON reply.
  for (const line of detail.trim().split("\n").reverse()) {
    try {
      const reply = JSON.parse(line);
      if (typeof reply?.error === "string") return new Error(reply.error);
    } catch {
      continue;
    }
  }
  return new Error(detail.trim());
}

async function output(executable: string, args: string[]): Promise<string> {
  let result;
  try {
    result = await execute(executable, args, { encoding: "utf8" });
  } catch (error) {
    const failure = error as Error & { stderr?: string; stdout?: string };
    const detail = failure.stderr?.trim() || failure.stdout?.trim();
    throw detail ? cliFailure(detail) : error;
  }
  // Plus 2.2.0 can return exit code zero after printing a rejected request on stderr.
  if (!result.stdout.trim() && result.stderr.trim()) throw cliFailure(result.stderr);
  return result.stdout.trim();
}

async function dockLockExecutable(): Promise<string> {
  if (verifiedExecutable) return verifiedExecutable;
  const apps = (await getApplications()).filter((app) => app.bundleId === "pro.docklock.plus");
  const app = apps.find((app) => app.path === "/Applications/DockLock Plus.app") ?? apps[0];
  if (!app) throw new Error("Install DockLock Plus 2.2.0 or later and complete its setup.");

  const executable = join(app.path, "Contents", "MacOS", "DockLock Plus");
  const version = /^DockLock Plus v(\d+)\.(\d+)/m.exec(await output(executable, ["--version"]));
  if (!version || Number(version[1]) < 2 || (Number(version[1]) === 2 && Number(version[2]) < 2)) {
    throw new Error("Update DockLock Plus to version 2.2.0 or later.");
  }
  verifiedExecutable = executable;
  return executable;
}

async function dockLock(args: string[]): Promise<unknown> {
  const text = await output(await dockLockExecutable(), [...args, "--json", "--no-ui"]);
  let reply;
  try {
    reply = JSON.parse(text);
  } catch {
    throw new Error("DockLock Plus returned an unreadable response.");
  }
  if (typeof reply?.error === "string") throw new Error(reply.error);
  return reply;
}

function isDisplay(value: unknown): value is DockLockDisplay {
  if (!value || typeof value !== "object") return false;
  const d = value as Partial<DockLockDisplay>;
  return (
    typeof d.id === "string" &&
    d.id.length > 0 &&
    typeof d.number === "number" &&
    typeof d.name === "string" &&
    typeof d.hardwareName === "string" &&
    typeof d.allowed === "boolean" &&
    typeof d.compatible === "boolean" &&
    (d.dockHere === null || typeof d.dockHere === "boolean") &&
    !!d.geometry &&
    [d.geometry.x, d.geometry.y, d.geometry.width, d.geometry.height].every(Number.isFinite)
  );
}

async function readDockValue(group: "dock" | "display", name: string): Promise<unknown> {
  const args = [group, name];
  try {
    return await dockLock(args);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      (error.message !== "CLI connection error" &&
        error.message !== "A Dock settings operation is in progress. Retry after it finishes.")
    ) {
      throw error;
    }
    await delay(400);
    return dockLock(args);
  }
}

export async function getDisplays(): Promise<DockLockDisplay[]> {
  const displays = await readDockValue("display", "list");
  if (!Array.isArray(displays) || !displays.every(isDisplay)) {
    throw new Error("DockLock Plus returned an invalid display list.");
  }
  return displays;
}

export async function getMovement(): Promise<string> {
  const mode = await readDockValue("dock", "movement");
  if (typeof mode !== "string") throw new Error("DockLock Plus returned an invalid movement mode.");
  return mode;
}

export async function getDockSize(): Promise<number> {
  const size = await readDockValue("dock", "size");
  if (typeof size !== "number" || !Number.isInteger(size) || size < 0 || size > 100) {
    throw new Error("DockLock Plus returned an invalid Dock size.");
  }
  return size;
}

async function applyDockAction(args: string[]): Promise<void> {
  const reply = await dockLock(args);
  if (
    !reply ||
    typeof reply !== "object" ||
    !("result" in reply) ||
    typeof reply.result !== "string" ||
    !reply.result
  ) {
    throw new Error("DockLock Plus did not acknowledge the command.");
  }
}

type DockEdge = "left" | "bottom" | "right";

function isDockEdge(value: unknown): value is DockEdge {
  return value === "left" || value === "bottom" || value === "right";
}

async function detectedDockEdge(): Promise<DockEdge | null> {
  const status = await readDockValue("dock", "status");
  if (status && typeof status === "object" && "position" in status) {
    if (isDockEdge(status.position)) return status.position;
    if (status.position === null || status.position === "unchanged") return null;
  }
  throw new Error("DockLock Plus returned an invalid Dock status.");
}

async function currentDockEdge(): Promise<DockEdge> {
  try {
    const position = await readDockValue("dock", "position");
    if (isDockEdge(position)) return position;
    throw new Error("DockLock Plus could not determine the Dock's orientation.");
  } catch (error) {
    // The CLI can still locate a visible Dock without its optional settings script.
    const detected = await detectedDockEdge().catch(() => null);
    if (detected) return detected;
    throw error;
  }
}

async function prepareDockMove(toSpecificDisplay: boolean): Promise<void> {
  if ((await currentDockEdge()) === "bottom") return;
  await applyDockAction(["dock", "position", "bottom"]);

  // The setting can change before the Dock settles. Poll reads only. A move by
  // display ID can proceed even when the CLI cannot identify the starting display.
  let detected: DockEdge | null = null;
  for (const wait of [0, 80, 160, 320, 640]) {
    if (wait) await delay(wait);
    detected = await detectedDockEdge();
    if (detected === "bottom" || (detected === null && toSpecificDisplay)) return;
  }
  if (detected) {
    throw new Error(`DockLock Plus still reports the Dock on the ${detected} edge after setting it to the bottom.`);
  }
}

export async function runAction(args: string[], success: string): Promise<void> {
  try {
    if (args[0] === "dock" && args[1] === "move") await prepareDockMove(args[2] === "--display");
    await applyDockAction(args);
    await showHUD(success);
  } catch (error) {
    await showFailureToast(error, { title: "DockLock Plus" });
  }
}

export function setDockOrientation(edge: DockEdge): Promise<void> {
  return runAction(["dock", "position", edge], `Dock set to the ${edge} edge`);
}

export async function changeDockSize(value: number | "increase" | "decrease"): Promise<void> {
  try {
    // Reapplying the current percentage can round it down by one Dock tile point.
    if (typeof value === "number" && (await getDockSize().catch(() => undefined)) === value) {
      await showHUD(`Dock size is ${value}%`);
      return;
    }
    await applyDockAction(["dock", "size", String(value)]);
    const actual = await getDockSize().catch(() => undefined);
    await showHUD(actual === undefined ? "Dock size updated" : `Dock size is ${actual}%`);
  } catch (error) {
    await showFailureToast(error, { title: "DockLock Plus" });
  }
}
