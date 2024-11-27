import type { Alert } from "@raycast/api";
import { confirmAlert, getApplications, open, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export const appNotInstallAlertDialog = async () => {
  const options: Alert.Options = {
    title: "OBS Studio is Not Installed",
    message: "OBS Studio not installed on your Mac. Please install and setup the websocket plugin to continue.",
    primaryAction: {
      title: "Get OBS Studio",
      onAction: () => {
        open("https://obsproject.com/");
      },
    },
  };
  await confirmAlert(options);
};

export const showWebsocketConnectionErrorToast = async () => {
  await showFailureToast("Websocket connection error. Please check your connection and try again.", {
    title: "Websocket Connection Error",
  });
  return popToRoot();
};

export async function appInstalled() {
  const applications = await getApplications();

  return !!applications.find((app) => app.bundleId === "com.obsproject.obs-studio");
}
