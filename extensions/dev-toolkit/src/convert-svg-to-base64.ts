import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;

    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    if (!clipboardText.includes("<svg") || !clipboardText.includes("</svg>")) {
      await showToast(Toast.Style.Failure, "Clipboard content doesn't appear to be valid SVG");
      return;
    }

    const base64 = Buffer.from(clipboardText).toString("base64");
    const dataUrl = `data:image/svg+xml;base64,${base64}`;

    await produceOutput(dataUrl);
  } catch (error) {
    await showError("Failed to convert SVG to Base64: " + String(error));
  }
}
