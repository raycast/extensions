import {
  getFrontmostApplication,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
  Toast,
  closeMainWindow,
  Icon,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { Action, ActionType } from "./types";
import {
  getActiveBrowserAfterRaycastCloses,
  getUrlOpenApplication,
  shouldResolveActiveBrowser,
} from "./browser-utils";

const execAsync = promisify(exec);

type ActionPreferences = Preferences & {
  openUrlsInActiveBrowser?: boolean;
};

export async function executeAction(
  action: Action,
  onComplete?: () => void,
  browser?: string,
): Promise<void> {
  const { type, value, label } = action;

  try {
    const prefs = getPreferenceValues<ActionPreferences>();
    const useActiveBrowser = shouldUseActiveBrowserForAction(action, prefs);
    await closeMainWindow();

    switch (type) {
      case "application":
        await openApp(value);
        break;
      case "url":
        await openUrl(value, browser, useActiveBrowser);
        break;
      case "folder":
        await openFolder(value);
        break;
      case "command":
        await runCommand(value);
        break;
    }

    await showHUD(`✓ ${label || value}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: "Action Failed",
      message,
    });
  } finally {
    if (onComplete) {
      onComplete();
    }
  }
}

async function openApp(appPath: string): Promise<void> {
  await open(appPath);
}

async function openUrl(
  url: string,
  browser?: string,
  useActiveBrowser = false,
): Promise<void> {
  if (url.startsWith("raycast://")) {
    await open(url);
    return;
  }

  const activeBrowser = useActiveBrowser
    ? await getActiveBrowserAfterRaycastCloses({ getFrontmostApplication })
    : null;

  const application = getUrlOpenApplication({
    activeBrowser,
    configuredBrowser: browser,
  });

  if (application) {
    await open(url, application);
  } else {
    await open(url);
  }
}

function shouldUseActiveBrowserForAction(
  action: Action,
  prefs: ActionPreferences,
): boolean {
  if (action.type !== "url") {
    return false;
  }

  return shouldResolveActiveBrowser(
    action.value,
    prefs.openUrlsInActiveBrowser,
  );
}

async function openFolder(folderPath: string): Promise<void> {
  await open(folderPath);
}

async function runCommand(command: string): Promise<void> {
  await execAsync(command);
}

export function getActionIcon(type: ActionType | "group"): Icon {
  switch (type) {
    case "application":
      return Icon.AppWindow;
    case "url":
      return Icon.Globe;
    case "folder":
      return Icon.Folder;
    case "command":
      return Icon.Terminal;
    case "group":
      return Icon.Folder;
  }
}

export function getActionTypeLabel(type: ActionType | "group"): string {
  switch (type) {
    case "application":
      return "Application";
    case "url":
      return "URL / Raycast Deeplink";
    case "folder":
      return "Folder";
    case "command":
      return "Shell Command";
    case "group":
      return "Group";
  }
}
