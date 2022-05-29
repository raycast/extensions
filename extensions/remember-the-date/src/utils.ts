import { showToast, Toast } from "@raycast/api";
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
