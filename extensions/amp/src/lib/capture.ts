import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { collectNativeContext } from "./context";
import { getCapturesDirectory, replacePendingCapture } from "./storage";
import type { CaptureEntry } from "../types";

const execFileAsync = promisify(execFile);

interface NativeWindowInfo {
  id: string;
  owner: string;
  title: string;
  pid: number;
  bundleId: string;
  applicationPath: string;
  bounds: { x: number; y: number; width: number; height: number };
}

function windowInfoPaths(): { source: string; binary: string } {
  return {
    source: join(environment.assetsPath, "window-info.swift"),
    binary: join(environment.supportPath, "window-info"),
  };
}

/**
 * Interpreting the helper costs 1–5 s per capture, so a compiled binary
 * (~50 ms) is kept in the support directory. Recompiles when the shipped
 * source is newer than the binary. Safe to fire and forget.
 */
export async function ensureWindowInfoBinary(): Promise<string | undefined> {
  const { source, binary } = windowInfoPaths();
  try {
    const [binaryStat, sourceStat] = await Promise.all([
      stat(binary),
      stat(source),
    ]);
    if (binaryStat.mtimeMs > sourceStat.mtimeMs) return binary;
  } catch {
    // Not compiled yet.
  }
  try {
    await execFileAsync(
      "/usr/bin/xcrun",
      ["swiftc", "-O", source, "-o", binary],
      { timeout: 120_000 },
    );
    return binary;
  } catch {
    return undefined;
  }
}

async function getNativeWindow(): Promise<NativeWindowInfo> {
  const { source, binary } = windowInfoPaths();
  let runnable = binary;
  try {
    await stat(binary);
    // A capture must not wait for a compile; the interpreter covers this run
    // and the binary is ready for the next one.
    void ensureWindowInfoBinary();
  } catch {
    void ensureWindowInfoBinary();
    runnable = source;
  }
  const command = runnable === binary ? binary : "/usr/bin/swift";
  const args = runnable === binary ? [] : [source];
  const { stdout } = await execFileAsync(command, args, {
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout) as NativeWindowInfo;
}

export async function captureActiveWindow(): Promise<{
  capture: CaptureEntry;
}> {
  const window = await getNativeWindow();

  const id = randomUUID();
  const capturesDirectory = await getCapturesDirectory();
  const path = join(
    capturesDirectory,
    `${new Date().toISOString().replaceAll(":", "-")}-${id}.png`,
  );

  // The screenshot fires immediately; context collection overlaps it instead
  // of delaying it.
  const screenshot = execFileAsync(
    "/usr/sbin/screencapture",
    ["-x", "-o", "-l", window.id, path],
    { timeout: 15_000 },
  );
  const contextPromise = collectNativeContext();

  try {
    await screenshot;
  } catch (error) {
    const message = String(error);
    if (message.includes("could not create image from window")) {
      throw new Error(
        "macOS blocked the screenshot. Enable Screen & System Audio Recording for Raycast in System Settings → Privacy & Security, then relaunch Raycast.",
      );
    }
    throw error;
  }
  const context = await contextPromise;

  context.application = {
    name: window.owner,
    bundleId: window.bundleId || undefined,
    path: window.applicationPath || undefined,
  };
  context.window = {
    ...context.window,
    id: window.id,
    title: window.title || context.window?.title,
    bounds: JSON.stringify(window.bounds),
  };
  const capture: CaptureEntry = {
    id,
    path,
    createdAt: new Date().toISOString(),
    context,
  };
  await replacePendingCapture(capture);
  return { capture };
}
