import { Toast, closeMainWindow, getApplications, open, showHUD, showToast } from "@raycast/api";

const bundleId = "com.fayazahmed.Screendrop";
const downloadURL = "https://github.com/fayazara/Screendrop/releases/latest";

/**
 * Closes Raycast, so it is out of the way before a capture starts, and
 * opens a Screendrop link. Tells the user what to do when it can't.
 */
export async function run(url: string) {
  const apps = await getApplications();
  if (!apps.some((app) => app.bundleId === bundleId)) {
    // Raycast is still open here, so the toast's action can be clicked.
    await showToast({
      style: Toast.Style.Failure,
      title: "Screendrop is not installed",
      message: "Install Screendrop v0.40.1 or later to use this command.",
      primaryAction: {
        title: "Download Screendrop",
        onAction: () => open(downloadURL),
      },
    });
    return;
  }

  await closeMainWindow();
  try {
    await open(url, bundleId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await showHUD(`Couldn't open Screendrop. Update to v0.40.1 or later. (${reason})`);
  }
}
