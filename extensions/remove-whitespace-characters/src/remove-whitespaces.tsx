import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";

function removeSpacesAndNewLines(inputText: string): string {
  return inputText.replace(/\s+/g, "");
}

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    const transformedText = removeSpacesAndNewLines(selectedText);
    await Clipboard.copy(transformedText);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
}
