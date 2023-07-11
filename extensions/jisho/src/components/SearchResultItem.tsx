import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useCallback } from "react";

import { SearchHistoryItem, SearchResult } from "../types/types";
import { SearchHistoryItems } from "../hooks/useSearchHistory";

export default function SearchResultItem({
  searchResult,
  addToHistory,
  removeFromHistory,
  historyItem,
}: {
  addToHistory: (result: SearchHistoryItem) => void;
  removeFromHistory: (result: SearchHistoryItem) => void;
  historyItem?: boolean;
  searchResult: SearchResult;
}) {
  const title = searchResult.kanji || searchResult.reading;
  const onChoose = useCallback(
    () => addToHistory(SearchHistoryItems.resultItem(searchResult)),
    [searchResult, addToHistory],
  );

  return (
    <List.Item
      title={title}
      subtitle={searchResult.kanji ? searchResult.reading : ""}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser onOpen={onChoose} url={new URL(searchResult.url).href} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              onCopy={onChoose}
              title="Copy"
              content={title}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            {searchResult.reading && (
              <Action.CopyToClipboard
                title="Copy Reading"
                content={searchResult.reading}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Add to History"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
              onAction={() => {
                addToHistory(SearchHistoryItems.resultItem(searchResult));
                showToast({
                  title: "Added to history",
                  style: Toast.Style.Success,
                });
              }}
            />
            {historyItem && (
              <Action
                title="Remove from History"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
                onAction={() => {
                  removeFromHistory(SearchHistoryItems.resultItem(searchResult));
                  showToast({
                    title: "Removed from history.",
                    style: Toast.Style.Success,
                  });
                }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: searchResult.definition.join(", ") || "No definition",
        },
      ]}
    />
  );
}
