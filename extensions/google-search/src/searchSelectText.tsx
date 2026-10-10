import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
  LocalStorage,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { nanoid } from "nanoid";
import { getSearchHistory } from "./utils/handleResults";
import { getSearchUrl } from "./utils/resultUtils";
import { HISTORY_KEY, Preferences, SearchResult } from "./utils/types";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  try {
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
    const searchUrl = getSearchUrl(searchText);
    await open(searchUrl);
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });

    const history = await getSearchHistory();
    const newSearch: SearchResult = {
      id: nanoid(),
      query: searchText,
      description: `Search Google for '${searchText}'`,
      url: searchUrl,
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
