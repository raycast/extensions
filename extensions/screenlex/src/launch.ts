import { execFile } from "node:child_process";

import { closeMainWindow, showHUD } from "@raycast/api";

import { getScreenLexAction, type ScreenLexActionId } from "./actions";

function openURLInBackground(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/open", ["-g", url], (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function launchScreenLexAction(
  id: ScreenLexActionId,
): Promise<void> {
  const action = getScreenLexAction(id);

  await closeMainWindow({ clearRootSearch: true });

  try {
    await openURLInBackground(action.url);
  } catch {
    await showHUD("Update ScreenLex to a version with Raycast support");
  }
}
