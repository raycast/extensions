import { getApplications, showToast, Toast, open } from "@raycast/api";

export async function checkPomoInstallation(
  showErrorToast = true,
): Promise<boolean> {
  const applications = await getApplications();
  const pomoApp = applications.find((app) => app.bundleId === "com.pomo.app");

  if (pomoApp) {
    return true;
  }

  // NOTE: For debugging locally with Xcode, return true if needed
  // return true;

  if (showErrorToast) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Pomo App Not Found",
      message: "Download the app to continue.",
      primaryAction: {
        title: "Download Pomo",
        onAction: () => {
          open("https://github.com/claudfuen/Pomo/releases/latest");
        },
      },
    });
  }

  return false;
}
