import { Alert, confirmAlert, open } from "@raycast/api";

export const betterZipNotInstallDialog = async () => {
  const options: Alert.Options = {
    icon: { source: "betterzip-icon.png" },
    title: "BetterZip Not Installed",
    message: "BetterZip is not installed on your Mac. Please install BetterZip to use this command.",
    primaryAction: {
      title: "Get BetterZip",
      onAction: () => {
        open("https://macitbetter.com");
      },
    },
  };
  await confirmAlert(options);
};
