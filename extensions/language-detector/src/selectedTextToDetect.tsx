import { Toast, closeMainWindow, getSelectedText, showHUD } from "@raycast/api";
import { detectLanguage } from "./utils.js";

export default async function SelectedTextToSay() {
  await closeMainWindow();
  try {
    const toast = new Toast({ style: Toast.Style.Animated, title: "Detecting language..." });
    toast.show();
    const selectedText = await getSelectedText();
    const { languageName } = await detectLanguage(selectedText);
    toast.style = Toast.Style.Success;
    toast.title = languageName;
  } catch (error) {
    showHUD(error instanceof Error ? error.message : "An error occurred while getting selected text.");
  }
}
