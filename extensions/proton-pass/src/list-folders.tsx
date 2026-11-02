import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { BrowseItemsContext } from "./search-items";

/**
 * List Folders opens Browse Items on the folders, by vault, so that they have Browse Items' preferences.
 * A command of its own, like List Vaults, so that it can have a hotkey.
 */
export default async function Command() {
  const context: BrowseItemsContext = { openOn: "folders" };
  try {
    await launchCommand({ name: "search-items", type: LaunchType.UserInitiated, context });
  } catch {
    // Raycast refuses to launch a disabled command.
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't Open Browse Items",
      message: "Enable Browse Items in Raycast's settings to see your folders.",
    });
  }
}
