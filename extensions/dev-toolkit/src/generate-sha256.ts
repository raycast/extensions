import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";
import crypto from "crypto";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;

    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    const sha256Hash = crypto.createHash("sha256").update(clipboardText).digest("hex");
    await produceOutput(sha256Hash);
  } catch (error) {
    await showError("Failed to generate SHA256 hash: " + String(error));
  }
}
