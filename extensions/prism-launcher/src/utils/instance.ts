import { spawn } from "child_process";

import { isWin, winPrismLauncherPath } from "./prism";
import { showToast, Toast } from "@raycast/api";

export const joinServer = async (instanceId: string, serverAddress: string) => {
  try {
    if (isWin) {
      spawn(winPrismLauncherPath, ["--launch", instanceId, "--server", serverAddress]);
    } else {
      spawn("open", [
        "-b",
        "org.prismlauncher.PrismLauncher",
        "--args",
        "--launch",
        instanceId,
        "--server",
        serverAddress,
      ]);
    }
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to launch Prism Launcher" });
  }
};

export const launchInstance = async (instanceId: string) => {
  try {
    if (isWin) {
      spawn(winPrismLauncherPath, ["--launch", instanceId]);
    } else {
      spawn("open", ["-b", "org.prismlauncher.PrismLauncher", "--args", "--launch", instanceId]);
    }
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to launch Prism Launcher" });
  }
};

export const showInstance = async (instanceId: string) => {
  try {
    if (isWin) {
      spawn(winPrismLauncherPath, ["--show", instanceId]);
    } else {
      spawn("open", ["-b", "org.prismlauncher.PrismLauncher", "--args", "--show", instanceId]);
    }
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to launch Prism Launcher" });
  }
};
