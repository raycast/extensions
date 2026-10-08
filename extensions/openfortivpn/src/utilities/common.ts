import { Alert, confirmAlert, open, showHUD } from "@raycast/api";
import { existsSync } from "fs";

export async function checkOpenFortiVpn() {
  const alertOptions: Alert.Options = {
    title: "Missing openfortivpn",
    message: "You have to install openfortivpn first",
    primaryAction: {
      title: "How to install",
    },
    dismissAction: {
      title: "Close",
    },
  };
  if (existsSync("/opt/homebrew/bin/openfortivpn")) {
    return true;
  } else {
    if (await confirmAlert(alertOptions)) {
      await open("https://github.com/raycast/extensions/tree/main/extensions/openfortivpn#how-to-install");
    }
    return false;
  }
}

export async function checkErrors(stderr: string) {
  if (stderr.includes("Operation not permitted")) {
    const alertOptions: Alert.Options = {
      title: "Can't Use Sudo",
      message:
        "It seems your user can't use sudo without a password. Please turn off using sudo in the extension preferences or change your sudo configuration.",
      primaryAction: {
        title: "Learn More",
      },
      dismissAction: {
        title: "Close",
      },
    };
    if (await confirmAlert(alertOptions)) {
      await open("https://github.com/raycast/extensions/tree/main/extensions/openfortivpn#use-sudo");
    }
  } else {
    await showHUD("Connection problem");
  }
}
