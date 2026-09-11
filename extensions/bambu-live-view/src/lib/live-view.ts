import { closeMainWindow, launchCommand, LaunchType, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { loadConfig } from "./config";
import { findMpv, runningViewerPid, startViewer, stopViewer } from "./mpv";
import { testConnection } from "./network";

const openSetupAction = (): Toast.ActionOptions => ({
  title: "Open Printer Setup",
  onAction: () => launchCommand({ name: "setup-printer", type: LaunchType.UserInitiated }),
});

async function fail(title: string, message?: string) {
  await showToast({ style: Toast.Style.Failure, title, message, primaryAction: openSetupAction() });
}

/** Opens the live view, or closes it if it's already open. */
export async function toggleLiveView() {
  const pid = runningViewerPid();
  if (pid !== undefined) {
    stopViewer(pid);
    await showHUD("Live view closed");
    return;
  }
  await openLiveView();
}

export async function openLiveView() {
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
    await fail("Couldn't start mpv", error instanceof Error ? error.message : String(error));
    return;
  }

  await toast.hide();
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  await showHUD("Live view opened");
}
