import {
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

const execAsync = promisify(exec);

export async function executeAction(
  action: Action,
  onComplete?: () => void,
  browser?: string,
): Promise<void> {
  const { type, value, label } = action;

  try {
    await closeMainWindow();

    switch (type) {
      case "application":
        await openApp(value);
        break;
      case "url":
        await openUrl(value, browser);
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

async function openUrl(url: string, browser?: string): Promise<void> {
  if (browser && !url.startsWith("raycast://")) {
    await open(url, browser);
  } else {
    await open(url);
  }
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
