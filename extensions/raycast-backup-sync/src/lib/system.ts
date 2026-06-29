import { execFile } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as crypto from "crypto";

const exec = promisify(execFile);

/** True if a Raycast process is currently running. */
export async function isRaycastRunning(): Promise<boolean> {
  try {
    // pgrep exits 0 with matches, 1 with none. execFile throws on non-zero exit.
    const { stdout } = await exec("pgrep", ["-x", "Raycast"]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/** Ask Raycast to quit, then wait until its process is gone (or the timeout elapses). */
export async function quitRaycast(timeoutMs = 8000): Promise<boolean> {
  try {
    await exec("osascript", ["-e", 'tell application "Raycast" to quit']);
  } catch {
    // If scripting fails, fall through to polling — the user may quit manually.
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isRaycastRunning())) return true;
    await delay(300);
  }
  return !(await isRaycastRunning());
}

/** Best-effort stable per-machine identifier (macOS IOPlatformUUID), hashed. */
export async function getDeviceId(): Promise<string> {
  try {
    const { stdout } = await exec("ioreg", [
      "-rd1",
      "-c",
      "IOPlatformExpertDevice",
    ]);
    const match = stdout.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
    if (match) {
      return crypto
        .createHash("sha256")
        .update(match[1])
        .digest("hex")
        .slice(0, 32);
    }
  } catch {
    // fall through
  }
  return crypto
    .createHash("sha256")
    .update(os.hostname())
    .digest("hex")
    .slice(0, 32);
}

/** Installed Raycast version, parsed from its app bundle Info.plist. Null if unknown. */
export async function getRaycastVersion(): Promise<string | null> {
  try {
    const { stdout } = await exec("defaults", [
      "read",
      "/Applications/Raycast.app/Contents/Info",
      "CFBundleShortVersionString",
    ]);
    const v = stdout.trim();
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** macOS product version, e.g. "15.5". Null if unavailable. */
export async function getMacosVersion(): Promise<string | null> {
  try {
    const { stdout } = await exec("sw_vers", ["-productVersion"]);
    const v = stdout.trim();
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
