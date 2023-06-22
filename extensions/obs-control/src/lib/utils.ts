import { Alert, confirmAlert, open, getApplications, showToast, Toast } from "@raycast/api";

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
  return showToast({
    title: "Websocket Connection Error",
    message: "Websocket connection error. Please check your connection and try again.",
    style: Toast.Style.Failure,
  });
};

export async function appInstalled() {
  const applications = await getApplications();

  return !!applications.find((app) => app.bundleId === "com.obsproject.obs-studio");
}
