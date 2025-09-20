import * as fs from "fs";
import { Alert, confirmAlert, open } from "@raycast/api";

export const kekaInstalled = () => {
  try {
    const systemAppPath = "/Applications/Keka.app";
    const userAppPath = `${process.env.HOME}/Applications/Keka.app`;
    return fs.existsSync(systemAppPath) || fs.existsSync(userAppPath);
  } catch (e) {
    console.error(String(e));
    return false;
  }
};

export const kekaNotInstallDialog = async () => {
  const options: Alert.Options = {
    icon: { source: "keka-icon.png" },
    title: "Keka Not Installed",
    message:
      "Keka is not installed on your Mac. Please install Keka to use this command.",
    primaryAction: {
      title: "Get Keka",
      onAction: () => {
        open("https://www.keka.io");
      },
    },
  };
  await confirmAlert(options);
};
