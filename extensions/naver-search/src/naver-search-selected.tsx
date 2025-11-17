import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { getStaticResult } from "./naver/handleResults";
import { Preferences } from "./naver/types";

export default async function Command() {
  const { useClipboardFallback } = getPreferenceValues<Preferences>();

  const getSelectedTextOrFallbackToClipboard = async () => {
    try {
      return await getSelectedText();
    } catch {
      if (!useClipboardFallback) {
        throw new Error("No text selected.");
      }
    }

    let textInClipboard: string | undefined;
    try {
      textInClipboard = await Clipboard.readText();
    } catch {
      throw new Error("No text selected and clipboard is empty.");
    }

    if (!textInClipboard) {
      throw new Error("No text selected and clipboard is empty.");
    }

    return textInClipboard;
  };

  try {
    const textToSearch = await getSelectedTextOrFallbackToClipboard();
    const results = getStaticResult(textToSearch, "GENERAL");
    if (!results.length) throw new Error("No search results found");
    const searchResult = results[0];

    await open(searchResult.url);
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: String(error),
    });
  }
}
