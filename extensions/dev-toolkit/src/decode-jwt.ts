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

    const token = clipboardText.trim();

    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      throw new Error("Invalid JWT token");
    }

    const result = JSON.stringify(decoded, null, 2);
    await produceOutput(result);
  } catch (error) {
    await showError("Failed to decode JWT: " + String(error));
  }
}
