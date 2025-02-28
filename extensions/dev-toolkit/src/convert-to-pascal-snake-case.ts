import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";
import { pascalSnakeCase } from "change-case";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;
    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }
    const converted = pascalSnakeCase(clipboardText);
    await produceOutput(converted);
  } catch (error) {
    await showError("Failed to convert to Pascal_Snake_Case: " + String(error));
  }
}
