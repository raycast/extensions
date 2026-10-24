import {
  closeMainWindow,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { setTimeout } from "node:timers/promises";
import { ActionID } from "./actions";
import { deliver, dispatch, inspectInstallation, Request } from "./transport";

export interface LoopPreferences {
  appPath?: string;
  focusDelay?: string;
}
export async function sendRequest(request: Request): Promise<void> {
  try {
    const preferences = getPreferenceValues<LoopPreferences>();
    await deliver(request, Number(preferences.focusDelay || "250"), {
      inspect: () => inspectInstallation(preferences.appPath),
      close: () => closeMainWindow({ clearRootSearch: true }),
      wait: async (ms) => {
        await setTimeout(ms);
      },
      send: dispatch,
    });
    // URL delivery has no execution acknowledgement; do not claim the window moved.
    await showHUD("Sent to Loop");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Send Loop Command",
      message: error instanceof Error ? error.message : String(error),
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
  }
}
export const runAction = (value: ActionID) => sendRequest({ kind: "action", value });
