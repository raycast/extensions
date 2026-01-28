import { getSelectedText, showToast, Toast, closeMainWindow, showHUD, Clipboard } from "@raycast/api";
import pangu from "pangu";

export default async function main() {
  try {
    const selection = await getSelection();

    if (selection.trim().length === 0) {
      showHUD("No valid text is selected.");
      closeMainWindow();
      return;
    }

    const correctedSelection = pangu.spacing(selection);
    Clipboard.paste(correctedSelection);
    showHUD("Text has been auto-corrected.");
    closeMainWindow();
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "An error occurred.",
    });
  }
}

async function getSelection() {
  try {
    return await getSelectedText();
  } catch (error) {
    return "";
  }
}
