import { Alert, confirmAlert, open } from "@raycast/api";

export const appNotInstallAlertDialog = async () => {
  const options: Alert.Options = {
    icon: { source: "extension-icon.png" },
    title: "Just Focus Not Installed",
    message: "Just Focus is not installed on your Mac. Please install Just Focus to use this command.",
    primaryAction: {
      title: "Get Just Focus",
      onAction: () => {
        open("https://getjustfocus.com");
      },
    },
  };
  await confirmAlert(options);
};
