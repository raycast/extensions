import { execSync } from "node:child_process";
import { WindowManagement, getPreferenceValues, open } from "@raycast/api";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { appendError } from "./utils.js";

type LaunchContext = {
  getActiveWindow?: boolean;
  getWindowsOnActiveDesktop?: boolean;
  getDesktops?: boolean;
  setWindowBounds?: Parameters<typeof WindowManagement.setWindowBounds>;
  callbackOpen?: Parameters<typeof open>;
  callbackExec?: Parameters<typeof execSync>;
  callbackLaunchOptions?: LaunchOptions;
};

type Result = {
  activeWindow?: Awaited<ReturnType<typeof WindowManagement.getActiveWindow>>;
  windowsOnActiveDesktop?: Awaited<ReturnType<typeof WindowManagement.getWindowsOnActiveDesktop>>;
  desktops?: Awaited<ReturnType<typeof WindowManagement.getDesktops>>;
  errors?: string[];
};

export default async function Api({ launchContext = {} }: { launchContext: LaunchContext }) {
  const {
    getActiveWindow,
    getWindowsOnActiveDesktop,
    getDesktops,
    setWindowBounds,
    callbackOpen,
    callbackExec,
    callbackLaunchOptions,
  } = launchContext;
  const { enableExecuteShellSupport } = getPreferenceValues<ExtensionPreferences>();

  const result: Result = {};

  if (getActiveWindow) {
    try {
      const activeWindow = await WindowManagement.getActiveWindow();
      result.activeWindow = activeWindow;
    } catch (error) {
      appendError(result, "WindowManagement.getActiveWindow()", error);
    }
  }

  if (getWindowsOnActiveDesktop) {
    try {
      const windows = await WindowManagement.getWindowsOnActiveDesktop();
      result.windowsOnActiveDesktop = windows;
    } catch (error) {
      appendError(result, "WindowManagement.getWindowsOnActiveDesktop()", error);
    }
  }

  if (getDesktops) {
    try {
      const desktops = await WindowManagement.getDesktops();
      result.desktops = desktops;
    } catch (error) {
      appendError(result, "WindowManagement.getDesktops()", error);
    }
  }

  if (setWindowBounds) {
    try {
      await WindowManagement.setWindowBounds(...setWindowBounds);
    } catch (error) {
      appendError(result, "WindowManagement.setWindowBounds()", error);
    }
  }

  if (callbackOpen) {
    try {
      await open(
        callbackOpen[0].replace("RAYCAST_PORT_WINDOW_MANAGEMENT_RESULT", encodeURIComponent(JSON.stringify(result))),
        callbackOpen[1],
      );
    } catch (error) {
      appendError(result, "open()", error);
    }
  }

  if (callbackExec) {
    if (enableExecuteShellSupport) {
      try {
        process.env.RAYCAST_PORT_WINDOW_MANAGEMENT_RESULT = JSON.stringify(result);
        execSync(...callbackExec);
      } catch (error) {
        appendError(result, "execSync()", error);
      }
    } else {
      appendError(result, "callbackExec", "Shell support is disabled. Please enable it in the extension preferences.");
    }
  }

  if (callbackLaunchOptions) {
    try {
      await callbackLaunchCommand(callbackLaunchOptions, { result });
    } catch (error) {
      appendError(result, "callbackLaunchCommand()", error);
    }
  }
}
