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

    const sha512Hash = crypto.createHash("sha512").update(clipboardText).digest("hex");
    await produceOutput(sha512Hash);
  } catch (error) {
    await showError("Failed to generate SHA512 hash: " + String(error));
  }
}
