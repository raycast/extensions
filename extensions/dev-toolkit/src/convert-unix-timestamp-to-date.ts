import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";
import { formatInTimeZone } from "date-fns-tz";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;
    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }
    const timestamp = Number(clipboardText.trim());
    if (isNaN(timestamp)) {
      throw new Error("Clipboard content is not a valid number");
    }
    // Convert to Date object (handling both seconds and milliseconds)
    const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid timestamp");
    }
    // Format the date using date-fns-tz instead of manual UTC calculation
    const formattedDate = formatInTimeZone(date, "UTC", "EEE d MMMM yyyy HH:mm:ss");
    await produceOutput(`${formattedDate} UTC`);
  } catch (error) {
    await showError("Failed to convert from Unix timestamp: " + String(error));
  }
}
