import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { tryReadJSONPref } from "./lib/plist";
import {
  buildStartURL,
  openSpokenlyURL,
  simulateShortcut,
  ShortcutKeys,
} from "./lib/urls";

interface MainPrompt {
  id: string;
  shortcut?: { keys?: ShortcutKeys };
}

export default async function main() {
  const { useShortcutFallback } = getPreferenceValues<Preferences>();
  const mainPrompt = tryReadJSONPref<MainPrompt>("mainPrompt");

  try {
    if (useShortcutFallback) {
      const keys = mainPrompt?.shortcut?.keys;
      if (!keys) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No dictation shortcut configured",
          message: "Set one in Spokenly → Preferences first.",
        });
        return;
      }
      await simulateShortcut(keys);
      await showHUD("Dictation shortcut sent");
      return;
    }

    if (!mainPrompt?.id) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read Spokenly main prompt",
        message:
          "Open Spokenly at least once to initialise its preferences, then retry.",
      });
      return;
    }
    await openSpokenlyURL(buildStartURL(mainPrompt.id));
    await showHUD("Dictation started");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle dictation",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
