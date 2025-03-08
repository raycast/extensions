import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";
import jwt from "jsonwebtoken";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;

    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    const payload = JSON.parse(clipboardText);

    const token = jwt.sign(payload, "your-secret-key");

    await produceOutput(token);
  } catch (error) {
    await showError("Failed to encode JWT: " + String(error));
  }
}
