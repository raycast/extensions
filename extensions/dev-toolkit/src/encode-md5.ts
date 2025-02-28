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

    const md5Hash = crypto.createHash("md5").update(clipboardText).digest("hex");
    await produceOutput(md5Hash);
  } catch (error) {
    await showError("Failed to generate MD5 hash: " + String(error));
  }
}
