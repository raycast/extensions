import { showHUD, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  const text = await Clipboard.readText();
  if (!text) {
    showFailureToast("No text found in clipboard");
    return;
  }

  const objectIdPattern = /^[a-fA-F0-9]{24}$/;
  if (!objectIdPattern.test(text)) {
    showFailureToast("Clipboard does not contain a valid MongoDB ObjectId");
    return;
  }

  try {
    const timestampHex = text.substring(0, 8);
    const timestamp = parseInt(timestampHex, 16);
    const date = new Date(timestamp * 1000);
    const formattedDate = date.toISOString().replace("T", " ").substring(0, 19);
    Clipboard.copy(formattedDate);
    showHUD(`Timestamp copied to clipboard: ${formattedDate}`);
  } catch (error) {
    showFailureToast("Error converting ObjectId to timestamp: " + (error as Error).message);
  }
}
