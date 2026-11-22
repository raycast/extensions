import {
  Cache,
  Clipboard,
  PopToRootType,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
  open,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { RECENT_SEARCHES_KEY } from "./constants";
import { addRecentSearch, getSearchUrl } from "./search";

export default async function Command() {
  const { top_level_domain, useClipboardFallback } = getPreferenceValues<Preferences.SearchSelectText>();

  try {
    let searchText = (await getSelectedText().catch(() => "")).trim();
    if (!searchText && useClipboardFallback) {
      searchText = (await Clipboard.readText())?.trim() ?? "";
    }

    if (!searchText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Text Available",
        message: useClipboardFallback ? "No text selected, and the clipboard has no text" : "No text selected",
      });
      return;
    }

    await open(getSearchUrl(searchText, top_level_domain));

    const cache = new Cache();
    let recentSearches: string[] = [];
    try {
      const cachedSearches: unknown = JSON.parse(cache.get(RECENT_SEARCHES_KEY) ?? "[]");
      if (Array.isArray(cachedSearches)) {
        recentSearches = cachedSearches.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // A corrupt cache entry can be replaced by the current search.
    }
    cache.set(RECENT_SEARCHES_KEY, JSON.stringify(addRecentSearch(recentSearches, searchText)));

    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Search Amazon" });
  }
}
