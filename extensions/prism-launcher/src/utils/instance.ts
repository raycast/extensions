import { spawn } from "child_process";

import { getPrismLauncherPath, isWin } from "./prism";
import { showToast, Toast } from "@raycast/api";

// this is a workaround to get APPDATA and LOCALAPPDATA on Windows for essentials mod
const windowsEnv = {
  ...process.env,
  APPDATA: `${process.env.HOME}/AppData/Roaming`,
  LOCALAPPDATA: `${process.env.HOME}/AppData/Local`,
};

export const joinServer = async (instanceId: string, serverAddress: string) => {
  const prismLauncherPath = await getPrismLauncherPath();
  try {
    if (isWin) {
      if (prismLauncherPath)
        spawn(prismLauncherPath, ["--launch", instanceId, "--server", serverAddress], { env: windowsEnv });
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
  const prismLauncherPath = await getPrismLauncherPath();
  try {
    if (isWin) {
      if (prismLauncherPath) spawn(prismLauncherPath, ["--launch", instanceId], { env: windowsEnv });
    } else {
      spawn("open", ["-b", "org.prismlauncher.PrismLauncher", "--args", "--launch", instanceId]);
    }
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to launch Prism Launcher" });
  }
};

export const showInstance = async (instanceId: string) => {
  const prismLauncherPath = await getPrismLauncherPath();
  try {
    if (isWin) {
      if (prismLauncherPath) spawn(prismLauncherPath, ["--show", instanceId], { env: windowsEnv });
    } else {
      spawn("open", ["-b", "org.prismlauncher.PrismLauncher", "--args", "--show", instanceId]);
    }
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to launch Prism Launcher" });
  }
};
