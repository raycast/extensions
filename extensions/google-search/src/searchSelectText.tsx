import { getSelectedText, showToast, Toast, closeMainWindow, popToRoot, open, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { getSearchHistory } from "./utils/handleResults";
import { SearchResult, HISTORY_KEY } from "./utils/types";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    await open("https://www.google.com/search?q=" + selectedText);
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });

    const history = await getSearchHistory();
    const newSearch: SearchResult = {
      id: nanoid(),
      query: selectedText,
      description: `Search Google for '${selectedText}'`,
      url: `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`,
    };
    history.unshift(newSearch);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get selected text",
      message: String(error),
    });
  }
}
