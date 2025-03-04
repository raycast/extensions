import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { Item } from "./types";

export function pluralize(length: number): string {
  return `item${length > 1 ? "s" : ""}`;
}

export function validateItem(item: Item) {
  if (item.name === "") {
    showToast(Toast.Style.Failure, "An error occurred", "Name can not be empty");
    return false;
  }

  if (item.date === null) {
    showToast(Toast.Style.Failure, "An error occurred", "Please select a date");
    return false;
  }

  return true;
}

export async function refreshCommands() {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch (e) {
    () => {
      console.error("An error occurred while updating the menu bar", e);
    };
  }
  try {
    await launchCommand({ name: "up-next", type: LaunchType.Background });
  } catch (e) {
    () => {
      console.error("An error occurred while updating the up-next command", e);
    };
  }
}
