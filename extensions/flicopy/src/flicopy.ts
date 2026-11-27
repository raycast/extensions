import { Toast, closeMainWindow, getApplications, open, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const bundleId = "com.airglow.flicopy";

/** Opens a flicopy:// automation URL (https://flicopy.com/help/url-scheme/). */
export async function runFlicopy(path: string) {
  let installed: boolean;
  try {
    const applications = await getApplications();
    installed = applications.some((application) => application.bundleId === bundleId);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't check whether Flicopy is installed" });
    return;
  }

  if (!installed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Flicopy isn't installed",
      message: "Get it from flicopy.com",
      primaryAction: { title: "Open flicopy.com", onAction: () => open("https://flicopy.com/") },
    });
    return;
  }

  try {
    // Close Raycast first so it isn't in the screenshot or in the way of the selection.
    await closeMainWindow({ clearRootSearch: true });
    await open(`flicopy://${path}`, bundleId);
  } catch (error) {
    // Raycast is already closed here, so a toast wouldn't be seen.
    const reason = error instanceof Error ? error.message : String(error);
    await showHUD(`Couldn't open Flicopy: ${reason}`);
  }
}
