import { getSelectedText, open, showToast, Toast } from "@raycast/api";
import clean from "./utils/clean";
import { addToHistory } from "./utils/history";

export default async function Command() {
  try {
    const selectedText = clean(await getSelectedText());

    if (selectedText.length === 0)
      await showToast(Toast.Style.Failure, "No text selected", "Please select a word to search in the dictionary.");
    else {
      await addToHistory(selectedText);
      await open(`https://tfd.com/${encodeURIComponent(selectedText)}`);
    }
  } catch {
    await showToast(Toast.Style.Failure, "Unables to open dictionary");
  }
}
