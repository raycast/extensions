import * as fs from "fs";
import { Alert, confirmAlert, open } from "@raycast/api";

export const betterZipInstalled = () => {
  try {
    const appPath1 = "/Applications/BetterZip.app";
    const appPath2 = "/Applications/Setapp/BetterZip.app";
    return fs.existsSync(appPath1) || fs.existsSync(appPath2);
  } catch (e) {
    console.error(String(e));
    return false;
  }
};

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
