import { getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { performSearch } from "./utils/search";

interface Preferences {
  braveSearchUrl?: string;
  maxHistoryItems?: string;
  defaultOpenMode?: string;
}

export default async function Command(props: { arguments: { query: string } }) {
  const { query } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();

  // Default Brave search URL
  const searchUrl = preferences.braveSearchUrl || "https://search.brave.com/search?q=";
  const maxHistoryItems = parseInt(preferences.maxHistoryItems || "20", 10) || 20;
  const defaultOpenMode = (preferences.defaultOpenMode || "default") as "default" | "new-tab" | "new-window";

  if (!query || !query.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Empty search query",
      message: "Please provide a search query",
    });
    await popToRoot();
    return;
  }

  try {
    await performSearch(query.trim(), searchUrl, maxHistoryItems, defaultOpenMode);
    await showToast({
      style: Toast.Style.Success,
      title: "Search launched",
      message: `Searching for "${query}" in Brave`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Search failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  await popToRoot();
}
