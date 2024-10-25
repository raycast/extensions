import { getSelectedText, open, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();

    if (selectedText !== "") {
      await open(`mkdictionaries:///?text=${selectedText}`);
    } else {
      throw new Error("No text selected");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot seach dictionary",
      message: String(error),
    });
  }
}
