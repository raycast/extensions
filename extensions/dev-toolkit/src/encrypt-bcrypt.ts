import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";
import bcryptjs from "bcryptjs";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;

    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcryptjs.hash(clipboardText, saltRounds);

    await produceOutput(hashedPassword);
  } catch (error) {
    await showError("Failed to encrypt with bcrypt: " + String(error));
  }
}
