import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

type FocusAction = "enable" | "disable";

async function showFocusSyncFailure(message: string) {
  try {
    await showToast({
      style: Toast.Style.Failure,
      title: "Tomito updated, but Focus sync failed",
      message,
    });
  } catch {
    // Focus synchronization, including its error reporting, must not fail the Tomito command.
  }
}

export async function syncFocus(action: FocusAction) {
  let shortcutName: string | undefined;

  try {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.focusSyncEnabled) {
      return;
    }

    shortcutName =
      action === "enable" ? preferences.enableFocusShortcut?.trim() : preferences.disableFocusShortcut?.trim();

    if (!shortcutName) {
      await showFocusSyncFailure(`Configure the ${action} Focus Shortcut in extension preferences.`);
      return;
    }

    await runAppleScript(
      `on run argv
        tell application "Shortcuts Events" to run shortcut (item 1 of argv)
      end run`,
      [shortcutName],
    );
  } catch {
    const message = shortcutName
      ? `Could not run the shortcut “${shortcutName}”.`
      : "Focus synchronization could not run.";
    await showFocusSyncFailure(message);
  }
}
