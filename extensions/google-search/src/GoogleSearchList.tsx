import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List, open } from "@raycast/api";
import { getAiSearchUrl, getIcon } from "./utils/resultUtils";
import { SearchResult } from "./utils/types";
import { useSearch } from "./utils/useSearch";

interface GoogleSearchListProps {
  initialMode?: "default" | "ai";
}

export function GoogleSearchList({ initialMode = "default" }: GoogleSearchListProps) {
  const isAiMode = initialMode === "ai";
  const { isLoading, results, search, searchText, addHistory, deleteAllHistory, deleteHistoryItem } = useSearch();

  const handleOpenNormal = async (item: SearchResult) => {
    await addHistory(item);
    await open(item.url);
    await closeMainWindow();
  };

  const handleOpenAi = async (item: SearchResult) => {
    await addHistory(item);
    await open(getAiSearchUrl(item.query));
    await closeMainWindow();
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={search}
      searchBarPlaceholder={isAiMode ? "Search Google with AI or enter a URL..." : "Search Google or enter a URL..."}
    >
      <List.Section title="Results" subtitle={results.length + ""}>
        {results.map((item) => {
          const normalAction = (
            <Action
              key="normal-action"
              title="Open in Browser"
              onAction={() => handleOpenNormal(item)}
              icon={{ source: Icon.ArrowRight }}
              {...(isAiMode ? { shortcut: { modifiers: ["shift"], key: "return" } } : {})}
            />
          );

          const aiAction = (
            <Action
              key="ai-action"
              title="Search in AI Mode"
              onAction={() => handleOpenAi(item)}
              icon={{ source: Icon.Stars }}
              {...(!isAiMode ? { shortcut: { modifiers: ["shift"], key: "return" } } : {})}
            />
          );

          const primaryAction = isAiMode ? aiAction : normalAction;
          const secondaryAction = isAiMode ? normalAction : aiAction;

          return (
            <List.Item
              key={item.id}
              title={item.query}
              subtitle={item.description}
              icon={getIcon(item)}
              accessories={[{ icon: Icon.Stars, tooltip: "Search in AI Mode (⇧↵)" }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Result">
                    {primaryAction}
                    {secondaryAction}
                    <Action.CopyToClipboard title="Copy URL to Clipboard" content={item.url} />
                    <Action.CopyToClipboard
                      title="Copy Suggestion to Clipboard"
                      content={item.query}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action
                      title="Set as Search Text"
                      onAction={() => {
                        search(item.query);
                      }}
                      icon={{ source: Icon.MagnifyingGlass }}
                      shortcut={{ modifiers: ["shift"], key: "tab" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="History">
                    {item.isHistory && (
                      <Action
                        title="Remove from History"
                        onAction={async () => {
                          await deleteHistoryItem(item);
                        }}
                        icon={{ source: Icon.Trash }}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                      />
                    )}

                    <Action
                      title="Clear All History"
                      onAction={async () => {
                        await deleteAllHistory();
                      }}
                      icon={{ source: Icon.ExclamationMark }}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
