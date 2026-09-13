import {
  closeMainWindow,
  environment,
  launchCommand,
  LaunchType,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config";
import { findMpv, runningViewerPid, startViewer, stopViewer } from "./mpv";
import { StartupError } from "./mpv-ipc";
import { testConnection } from "./network";

const openSetupAction = (): Toast.ActionOptions => ({
  title: "Open Printer Setup",
  onAction: () => launchCommand({ name: "setup-printer", type: LaunchType.UserInitiated }),
});

async function fail(title: string, message?: string) {
  await showToast({ style: Toast.Style.Failure, title, message, primaryAction: openSetupAction() });
}

// --- Start lock ---------------------------------------------------------------
// Toggle Live View and the setup command's Open Live View run in separate processes. The lock stops two
// overlapping starts (e.g. a double-pressed hotkey while the connection check runs) from each spawning a
// window. It's claimed synchronously, before anything is awaited.

const lockFile = () => path.join(environment.supportPath, "starting.lock");
/** Longer than a start can take (connection check + mpv startup timeout), so a crashed start can't wedge it. */
const STALE_LOCK_MS = 30_000;

function acquireStartLock(): boolean {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  try {
    fs.writeFileSync(lockFile(), String(process.pid), { flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  try {
    if (Date.now() - fs.statSync(lockFile()).mtimeMs < STALE_LOCK_MS) return false;
    fs.rmSync(lockFile(), { force: true });
    fs.writeFileSync(lockFile(), String(process.pid), { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

function releaseStartLock() {
  fs.rmSync(lockFile(), { force: true });
}

// --- Commands -------------------------------------------------------------------

/** Opens the live view, or closes it if it's already open. */
export async function toggleLiveView() {
  const pid = runningViewerPid();
  if (pid !== undefined) {
    await stopViewer(pid);
    await showHUD("Live view closed");
    return;
  }
  await openLiveView();
}

export async function openLiveView() {
  if (!acquireStartLock()) {
    await showHUD("Live view is already starting…");
    return;
  }
  try {
    await startLiveView();
  } finally {
    releaseStartLock();
  }
}

async function startLiveView() {
  if (runningViewerPid() !== undefined) {
    await showHUD("Live view is already open");
    return;
  }

  const config = await loadConfig();
  if (!config) {
    await fail("Printer not set up", "Add your printer's IP address and access code first.");
    return;
  }

  const mpv = findMpv();
  if (!mpv) {
    await fail("mpv is not installed", "Install it with Homebrew: brew install mpv");
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to printer…" });
  const connection = await testConnection(config.ip, 2500);
  if (!connection.ok) {
    await toast.hide();
    await fail(connection.title, connection.message);
    return;
  }

  try {
    await startViewer(mpv, config);
  } catch (error) {
    await toast.hide();
    await fail(...startupFailureMessage(error));
    return;
  }

  await toast.hide();
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  await showHUD("Live view opened");
}

function startupFailureMessage(error: unknown): [string, string] {
  if (!(error instanceof StartupError)) {
    return ["Couldn't start mpv", error instanceof Error ? error.message : String(error)];
  }
  switch (error.reason) {
    case "auth":
      return [
        "Access code rejected",
        "The printer refused the access code. Check it under Settings → LAN Only on the printer — it changes if the refresh arrow is pressed.",
      ];
    case "timeout":
      return [
        "Stream didn't start",
        "The printer accepted the connection but no video arrived. Try again in a moment.",
      ];
    case "exited":
      return [
        "Stream failed to open",
        "mpv couldn't play the camera stream. Check that LAN Only Liveview is on and the access code is correct.",
      ];
  }
}
