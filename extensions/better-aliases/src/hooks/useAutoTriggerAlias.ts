import { Clipboard, closeMainWindow, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect } from "react";
import { getOpenTarget } from "../lib/openAlias";
import { getRandomizedValue } from "../lib/snippetUtils";
import type { BetterAliasItem, ExpandAliasPreferences } from "../schemas";

export function useAutoTriggerAlias(
  sortedEntries: [string, BetterAliasItem][],
  searchText: string,
  setSearchText: (text: string) => void,
  visitItem: (entry: [string, BetterAliasItem]) => void,
  preferences: ExpandAliasPreferences,
  options?: { forceSnippetMode?: boolean },
) {
  const shouldAutoTrigger = sortedEntries.length === 1 && searchText.trim();
  const targetEntry = shouldAutoTrigger ? sortedEntries[0] : null;

  useEffect(() => {
    if (!targetEntry) return;

    const [, aliasItem] = targetEntry;
    const snippetPrefix = preferences.snippetPrefix?.trim();
    const isSnippetMode =
      options?.forceSnippetMode || aliasItem.snippetOnly || !!(snippetPrefix && searchText.startsWith(snippetPrefix));

    if (isSnippetMode) {
      const valueToInsert = getRandomizedValue(aliasItem.value, preferences.randomizedSnippetSeparator);
      Clipboard.paste(valueToInsert)
        .then(() => {
          closeMainWindow();
          setSearchText("");
          visitItem(targetEntry);
        })
        .catch((error) => {
          showFailureToast(error, { title: "Error pasting value" });
        });
    } else {
      const targetToOpen = getOpenTarget(aliasItem.value);
      open(targetToOpen)
        .then(() => {
          // closeMainWindow should not be called here, it will close the entire application
          setSearchText("");
          visitItem(targetEntry);
        })
        .catch((error) => {
          showFailureToast(error, { title: "Error opening value" });
        });
    }
  }, [
    targetEntry,
    searchText,
    preferences.snippetPrefix,
    preferences.randomizedSnippetSeparator,
    visitItem,
    setSearchText,
  ]);
}
