import child_process from "child_process";

import { isWin, winPrismLauncherPath } from "./prism";
import { showToast, Toast } from "@raycast/api";

export const joinServer = async (instanceId: string, serverAddress: string) => {
  try {
    if (isWin) {
      child_process.exec(`${winPrismLauncherPath} --launch "${instanceId}" --server "${serverAddress}"`);
    } else {
      child_process.exec(
        `open -b "org.prismlauncher.PrismLauncher" --args --launch "${instanceId}" --server "${serverAddress}"`,
      );
    }
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to launch Prism Launcher" });
  }
};

export const launchInstance = async (instanceId: string) => {
  try {
    if (isWin) {
      child_process.exec(`${winPrismLauncherPath} --launch "${instanceId}"`);
    } else {
      child_process.exec(`open -b "org.prismlauncher.PrismLauncher" --args --launch "${instanceId}"`);
    }
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to launch Prism Launcher" });
  }
};

export const showInstance = async (instanceId: string) => {
  try {
    if (isWin) {
      child_process.exec(`${winPrismLauncherPath} --show "${instanceId}"`);
    } else {
      child_process.exec(`open -b "org.prismlauncher.PrismLauncher" --args --show "${instanceId}"`);
    }
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to launch Prism Launcher" });
  }
};
