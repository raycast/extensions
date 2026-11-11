import { environment } from "@raycast/api";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DesktopStatus, DesktopStream } from "../types";
import { execCommand } from "./commands";
import { machinePath, request } from "./instabox";

type DesktopAction = "status" | "install" | "start";

function desktopRequest(machineId: string, action: DesktopAction) {
  return request<DesktopStatus>("POST", machinePath(machineId, "/desktop"), { body: { action } });
}

export function getDesktopStatus(machineId: string) {
  return desktopRequest(machineId, "status");
}

const INSTALL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Makes sure the machine's desktop runs: installs its packages on first use (about half a minute)
 * and starts it when it is stopped.
 */
export async function ensureDesktopRunning(machineId: string, onProgress?: (message: string) => void) {
  let status = await getDesktopStatus(machineId);
  if (status.running) return status;

  if (!status.installed) {
    if (!status.installing) status = await desktopRequest(machineId, "install");
    onProgress?.("Installing the desktop, about half a minute…");
    const deadline = Date.now() + INSTALL_TIMEOUT_MS;
    while (!status.installed) {
      if (status.failed) {
        const lastLine = status.log?.trim().split("\n").pop();
        throw new Error(lastLine ? `Desktop install failed: ${lastLine}` : "Desktop install failed");
      }
      if (Date.now() > deadline) throw new Error("Timed out installing the desktop");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      status = await getDesktopStatus(machineId);
    }
  }

  onProgress?.("Starting the desktop…");
  return desktopRequest(machineId, "start");
}

/** A link to the dashboard's desktop viewer. Anyone with the link can open it until it expires. */
export function createDesktopLink(machineId: string, options: { viewOnly: boolean; ttlSeconds?: number }) {
  return request<DesktopStream>("POST", machinePath(machineId, "/desktop/stream"), {
    body: { viewOnly: options.viewOnly, ttlSeconds: options.ttlSeconds ?? 3600 },
  });
}

/** Every desktop link minted so far stops working and its open sessions end. */
export function revokeDesktopLinks(machineId: string) {
  return request<void>("DELETE", machinePath(machineId, "/desktop/stream"));
}

// Same tools and display as the SDK's `desktop.screenshot()`; JPEG keeps the output well under exec's 1 MiB cap.
const SCREENSHOT_SCRIPT = [
  "export DISPLAY=:1",
  'f="$(mktemp -u /tmp/raycast-screenshot-XXXXXX).jpg"',
  'if command -v scrot >/dev/null 2>&1; then scrot -o -q 80 "$f"',
  'elif command -v import >/dev/null 2>&1; then import -window root -quality 80 "jpg:$f"',
  "else echo 'No screenshot tool (scrot or ImageMagick) in the machine' >&2; exit 127; fi",
  'status=$?; [ $status -eq 0 ] && base64 -w0 "$f"; rm -f "$f"; exit $status',
].join("\n");

/** Captures the desktop and saves it as a JPEG in the extension's support folder. Returns its path. */
export async function captureScreenshot(machineId: string) {
  const result = await execCommand(machineId, { cmd: SCREENSHOT_SCRIPT, timeoutSeconds: 60 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `Screenshot failed with exit code ${result.exitCode}`);
  }
  if (result.truncated) throw new Error("The screenshot is too large to transfer");

  const folder = join(environment.supportPath, "screenshots");
  await mkdir(folder, { recursive: true });
  // Keep one screenshot per machine; a new file name also avoids a stale image in Raycast's cache.
  for (const file of await readdir(folder)) {
    if (file.startsWith(`${machineId}-`)) await rm(join(folder, file), { force: true });
  }
  const path = join(folder, `${machineId}-${Date.now()}.jpg`);
  await writeFile(path, Buffer.from(result.stdout.trim(), "base64"));
  return path;
}
