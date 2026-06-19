import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createBusyCalNaturalLanguageItem } from "./busycal-automation";
import { resolveBusyCalInstallation } from "./busycal-installation";

/**
 * Sends one quick natural-language entry into BusyCal's AppleScript-backed NLP command.
 *
 * - Parameters:
 *   - kind: Whether BusyCal should interpret the text as an event or task.
 *   - inputText: Raw quick-entry text typed in Raycast.
 * - Throws: When the text is empty or BusyCal cannot complete the automation request.
 */
export async function quickAdd(
  kind: "event" | "task",
  inputText: string,
): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const installation = await resolveBusyCalInstallation();
    const trimmedText = inputText.trim();
    if (!trimmedText) {
      throw new Error("Enter some text for BusyCal to parse.");
    }

    const createdItem = await createBusyCalNaturalLanguageItem(installation, {
      text: trimmedText,
      itemType: kind,
    });

    // HUD is the native confirmation style for no-view commands that close
    // Raycast. When the user keeps the command window open, a toast remains the
    // better inline confirmation.
    if (preferences.hideOnQuickAdd) {
      await showHUD(
        kind === "event" ? "BusyCal event created" : "BusyCal task created",
      );
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title:
        kind === "event" ? "BusyCal event created" : "BusyCal task created",
      message: createdItem.title,
    });
  } catch (error) {
    await showFailureToast(error, {
      title:
        kind === "event" ? "Could Not Create Event" : "Could Not Create Task",
    });
  }
}
