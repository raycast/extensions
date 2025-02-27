import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";
import { parseISO } from "date-fns";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;
    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }
    // Try to parse the date using date-fns for better parsing
    let date: Date;
    try {
      // First try to parse as ISO string
      date = parseISO(clipboardText.trim());
      if (isNaN(date.getTime())) {
        // If not an ISO string, try the native Date constructor
        date = new Date(clipboardText.trim());
      }
    } catch {
      // Fallback to native Date constructor
      date = new Date(clipboardText.trim());
    }
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date string");
    }
    const epochTimestamp = Math.floor(date.getTime() / 1000);
    await produceOutput(String(epochTimestamp));
  } catch (error) {
    await showError("Failed to convert date to epoch: " + String(error));
  }
}
