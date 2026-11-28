import { closeMainWindow, getApplications, open, showToast, Toast } from "@raycast/api";

export const TRELLIS_BUNDLE_ID = "app.trellisui.trelliswm";
const TRELLIS_SITE = "https://trelliswm.app";

async function isTrellisInstalled(): Promise<boolean> {
  const apps = await getApplications();
  return apps.some((app) => app.bundleId === TRELLIS_BUNDLE_ID);
}

/**
 * Runs a TrellisWM command through its trelliswm:// URL scheme.
 * The scheme is one-way: TrellisWM reports nothing back, so success means "the URL was opened".
 * URL commands need TrellisWM Pro. On Free, TrellisWM shows its own upgrade prompt.
 */
export async function runTrellisCommand(command: string): Promise<boolean> {
  if (!(await isTrellisInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "TrellisWM is not installed",
      primaryAction: { title: "Open trelliswm.app", onAction: () => open(TRELLIS_SITE) },
    });
    return false;
  }

  try {
    // Close Raycast first, so the window does not sit over the view TrellisWM moves to or saves.
    await closeMainWindow();
    await open(`trelliswm://${command}`, TRELLIS_BUNDLE_ID);
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not run TrellisWM command",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
