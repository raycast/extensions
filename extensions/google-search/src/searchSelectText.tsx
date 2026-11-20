import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
  LocalStorage,
  open,
  popToRoot,
} from "@raycast/api";
import { getSearchHistory, getStaticResult } from "./utils/handleResults";
import { getSearchUrl } from "./utils/resultUtils";
import { showErrorToast } from "./utils/showErrorToast";
import { HISTORY_KEY } from "./utils/types";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences.SearchSelectText>();
  const extensionPreferences = getPreferenceValues<Preferences>();

  try {
    // Try to get selected text first, fall back to clipboard if enabled. A blank
    // selection counts as no selection.
    let searchText = "";
    try {
      searchText = (await getSelectedText()).trim();
    } catch {
      // Nothing selected
    }

    if (!searchText && preferences.useClipboardFallback) {
      searchText = (await Clipboard.readText())?.trim() ?? "";
      if (!searchText) {
        throw new Error("No text selected, and the clipboard has no text");
      }
    }

    if (!searchText) {
      throw new Error("No text selected");
    }

    await open(getSearchUrl(searchText));
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });

    if (extensionPreferences.rememberSearchHistory) {
      const newSearch = { ...getStaticResult(searchText)[0], isHistory: true };
      const history = (await getSearchHistory()).filter((item) => item.url !== newSearch.url);
      history.unshift(newSearch);
      await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  } catch (error) {
    await showErrorToast("No text available", error);
  }
}
