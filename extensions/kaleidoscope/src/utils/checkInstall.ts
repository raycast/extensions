import { showToast, Toast, open } from "@raycast/api";
import { getKalApp } from "./getKalApp.ts";

export async function checkKaleidoscopeInstallation() {
  const applicationData = await getKalApp();
  if (!applicationData) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Kaleidoscope is not installed.",
      message: "Install the newest version from: https://kaleidoscope.app/download",
      primaryAction: {
        title: "Go to https://kaleidoscope.app/download",
        onAction: (toast) => {
          open("https://kaleidoscope.app/download");
          toast.hide();
        },
      },
    };

    await showToast(options);
    return;
  }
  return applicationData;
}
