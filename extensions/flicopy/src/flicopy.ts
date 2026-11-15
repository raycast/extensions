import { Toast, closeMainWindow, getApplications, open, showToast } from "@raycast/api";

const bundleId = "com.airglow.flicopy";

async function flicopyIsInstalled() {
  const applications = await getApplications();
  return applications.some((application) => application.bundleId === bundleId);
}

/** Opens a flicopy:// automation URL (https://flicopy.com/help/url-scheme/). */
export async function runFlicopy(path: string) {
  if (!(await flicopyIsInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Flicopy isn't installed",
      message: "Get it from flicopy.com",
      primaryAction: { title: "Open flicopy.com", onAction: () => open("https://flicopy.com/") },
    });
    return;
  }
  // Close Raycast first so it isn't in the screenshot or in the way of the selection.
  await closeMainWindow({ clearRootSearch: true });
  await open(`flicopy://${path}`, bundleId);
}
