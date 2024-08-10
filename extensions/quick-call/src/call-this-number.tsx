import { showToast, Toast, getSelectedText, Clipboard, open } from "@raycast/api";
import { fetchItemInputSelectedFirst } from "./utils/input-item-utils";
import { isValidPhoneNumber, cleanPhoneNumber } from "./utils/phone-number-utils";

export default async function Command() {
  try {
    // Try to get the selected text or clipboard content
    const input = await fetchItemInputSelectedFirst();

    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text detected",
        message: "Please select or copy a phone number",
      });
      return;
    }

    const cleanedNumber = cleanPhoneNumber(input);

    if (!isValidPhoneNumber(cleanedNumber)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid phone number",
        message: "The selected or copied text is not a valid phone number",
      });
      return;
    }

    // If we have a valid phone number, initiate the call
    await open(`tel:${cleanedNumber}`);

    await showToast({
      style: Toast.Style.Success,
      title: "Calling " + cleanedNumber,
      message: cleanedNumber,
    });
  } catch (error) {
    console.error("Error in Call This Number command:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "An unexpected error occurred",
    });
  }
}
