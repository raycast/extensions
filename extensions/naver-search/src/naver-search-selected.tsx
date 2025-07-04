import { Clipboard, closeMainWindow, getSelectedText, open, popToRoot, showToast, Toast } from "@raycast/api";
import { getStaticResult } from "./naver/handleResults";

export default async function Command() {
  try {
    let textToSearch: string;
    try {
      textToSearch = await getSelectedText();
    } catch {
      const textInClipboard = await Clipboard.readText();
      if (!textInClipboard) throw new Error("No text selected and clipboard is empty.");
      textToSearch = textInClipboard;
    }

    const searchResult = getStaticResult(textToSearch, "GENERAL")[0];
    await open(searchResult.url);
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text available",
      message: String(error),
    });
  }
}
