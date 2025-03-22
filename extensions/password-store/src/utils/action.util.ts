import { closeMainWindow, Clipboard } from "@raycast/api";
import { Option } from "../interfaces";
import { updateLastUsedPassword } from "./password.util";

/**
 * Performs an action (copy or paste) with the specified password option and updates the last used password.
 *
 * @param {string} selectedPassword - The selected password entry.
 * @param {{ title: string, value: string }} option - The option object containing the title and value.
 * @param {'copy' | 'paste'} action - The action to perform, either 'copy' or 'paste'.
 * @returns {Promise<void>} A promise that resolves when the action is complete.
 */
export const performAction = async (
  selectedPassword: string,
  option: Option,
  action: "copy" | "paste",
): Promise<void> => {
  try {
    // Update the last used password file
    await updateLastUsedPassword(selectedPassword, option.title);

    // Perform the specified action (copy or paste) with the option value
    await Clipboard[action](option.value);

    // Close the main window and clear the root search
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    // Log any errors that occur during the action
    console.error("Error performing action:", error);
  }
};
