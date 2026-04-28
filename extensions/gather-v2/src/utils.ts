import { closeMainWindow, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "fs";

const GATHER_APP_PATH = "/Applications/GatherV2.app";
const GATHER_APP_NAME = "GatherV2";

export function isGatherInstalled(): boolean {
  try {
    return fs.existsSync(GATHER_APP_PATH);
  } catch (e) {
    console.error(String(e));
    return false;
  }
}

export async function showGatherNotInstalledToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Gather V2 is not installed.",
    message: "Install it from: https://www.gather.town",
    primaryAction: {
      title: "Go to https://www.gather.town",
      onAction: (toast) => {
        open("https://www.gather.town");
        toast.hide();
      },
    },
  });
}

export type Modifier = "command down" | "shift down" | "option down" | "control down";

export async function sendGatherKeystroke(key: string, modifiers: Modifier[]): Promise<boolean> {
  if (!isGatherInstalled()) {
    await showGatherNotInstalledToast();
    return false;
  }

  await closeMainWindow();
  await runAppleScript(`activate application "${GATHER_APP_NAME}"`);

  const modifierClause = modifiers.length > 0 ? ` using {${modifiers.join(", ")}}` : "";
  await runAppleScript(`tell application "System Events" to keystroke "${key}"${modifierClause}`);

  return true;
}
