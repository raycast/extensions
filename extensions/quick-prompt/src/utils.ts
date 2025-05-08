import { getSelectedText } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function getSelectedTextContent(): Promise<string | undefined> {
  try {
    const selection = await getSelectedText();
    if (!selection || selection.trim() === "") {
      showFailureToast({
        title: "No Text Selected",
        message: "Please select some text to proceed",
      });
      return undefined;
    }
    return selection;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    showFailureToast({
      title: "Failed to Get Selected Text",
      message: `An error occurred while getting selected text: ${errorMessage}`,
    });
    return undefined;
  }
}
