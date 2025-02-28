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

    const epoch = Number(clipboardText.trim());
    if (isNaN(epoch)) {
      throw new Error("Not a valid number");
    }

    // Convert to Date object (handling both seconds and milliseconds)
    const date = new Date(epoch > 10000000000 ? epoch : epoch * 1000);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid epoch timestamp");
    }

    // Format the date in UTC using date-fns-tz
    const formattedDate = formatInTimeZone(date, "UTC", "EEE d MMMM yyyy HH:mm:ss");

    await produceOutput(`${formattedDate} UTC`);
  } catch (error) {
    await showError("Failed to convert from epoch: " + String(error));
  }
}
