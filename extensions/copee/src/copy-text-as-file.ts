import { Clipboard, getSelectedText } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { handleTextToFile } from "./api/helpers";

export default async function launchCommand() {
  try {
    const text = await getSelectedText();
    await handleTextToFile(text, Clipboard.copy);
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving content" });
  }
}
