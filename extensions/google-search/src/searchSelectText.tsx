import {
  getSelectedText,
  showToast,
  Toast,
  closeMainWindow,
  popToRoot,
  open,
  LocalStorage,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { nanoid } from "nanoid";
import { getSearchHistory } from "./utils/handleResults";
import { SearchResult, HISTORY_KEY } from "./utils/types";

interface Preferences {
  useClipboardFallback: boolean;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    // Try to get selected text first, fall back to clipboard if enabled
    let searchText: string;
    try {
      searchText = await getSelectedText();
    } catch {
      if (!preferences.useClipboardFallback) {
        throw new Error("No text selected");
      }
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        throw new Error("No text selected and clipboard is empty");
      }
      searchText = clipboardText;
    }
    await open("https://www.google.com/search?q=" + searchText);
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });

    const history = await getSearchHistory();
    const newSearch: SearchResult = {
      id: nanoid(),
      query: searchText,
      description: `Search Google for '${searchText}'`,
      url: `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
    };
    history.unshift(newSearch);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text available",
      message: String(error),
    });
  }
}
