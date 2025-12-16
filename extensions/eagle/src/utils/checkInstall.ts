import { getApplications, showToast, Toast, open } from "@raycast/api";
import { getApplicationInfo } from "./api";

async function isEagleInstalled() {
  const applications = await getApplications();
  return applications.some(
    (app) =>
      app.bundleId === "tw.ogdesign.eagle" || // macOS
      app.windowsAppId?.includes("Eagle"), // Windows
  );
}

export async function checkEagleInstallation() {
  try {
    await getApplicationInfo();
  } catch (e) {
    console.error(e);
  }

  const installed = await isEagleInstalled();

  if (!installed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Eagle is not installed.",
      message: "Install it from: https://eagle.cool",
      primaryAction: {
        title: "Go to https://eagle.cool",
        onAction: (toast) => {
          open("https://eagle.cool");
          toast.hide();
        },
      },
    });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Eagle is not running or API is disabled.",
      message: "Make sure Eagle is running and API server is enabled (Settings → Advanced → Enable HTTP API)",
    });
  }
}
