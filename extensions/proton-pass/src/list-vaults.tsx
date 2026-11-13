import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { BrowseItemsContext } from "./search-items";

/**
 * List Vaults opens Browse Items on the vault list, so that there's one vault list, with Browse Items' preferences.
 * It stays a command of its own so that its hotkeys and aliases still work.
 */
export default async function Command() {
  const context: BrowseItemsContext = { openOn: "vaults" };
  try {
    await launchCommand({ name: "search-items", type: LaunchType.UserInitiated, context });
  } catch {
    // Raycast refuses to launch a disabled command.
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't Open Browse Items",
      message: "Enable Browse Items in Raycast's settings to see your vaults.",
    });
  }
}
