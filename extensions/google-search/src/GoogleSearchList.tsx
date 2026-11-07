import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List, open } from "@raycast/api";
import { executeAiSearch, executeNormalSearch, getIcon, getSearchModeActions } from "./utils/resultUtils";
import { SearchMode, SearchResult } from "./utils/types";
import { useSearch } from "./utils/useSearch";

interface GoogleSearchListProps {
  initialMode?: SearchMode;
  initialQuery?: string;
}

export function GoogleSearchList({ initialMode = "default", initialQuery = "" }: GoogleSearchListProps) {
  const isAiMode = initialMode === "ai";
  const { isLoading, results, search, searchText, addHistory, deleteAllHistory, deleteHistoryItem } =
    useSearch(initialQuery);

  const handleOpenNormal = async (item: SearchResult) => {
    await executeNormalSearch(item, addHistory, open, closeMainWindow);
  };

  const handleOpenAi = async (item: SearchResult) => {
    await executeAiSearch(item, addHistory, open, closeMainWindow);
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
          const actions = getSearchModeActions(initialMode, item);

          return (
            <List.Item
              key={item.id}
              title={item.query}
              subtitle={item.description}
              icon={getIcon(item)}
              accessories={[actions.accessory]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Result">
                    <Action
                      title={actions.primaryAction.title}
                      onAction={() =>
                        actions.primaryAction.id === "open-ai" ? handleOpenAi(item) : handleOpenNormal(item)
                      }
                      icon={{ source: actions.primaryAction.icon ?? Icon.ArrowRight }}
                    />

                    <Action.CopyToClipboard
                      title={actions.copyUrlAction.title}
                      content={actions.copyUrlAction.content ?? ""}
                      shortcut={actions.copyUrlAction.shortcut}
                    />

                    <Action
                      title={actions.alternateSearchAction.title}
                      onAction={() =>
                        actions.alternateSearchAction.id === "open-ai" ? handleOpenAi(item) : handleOpenNormal(item)
                      }
                      icon={{ source: actions.alternateSearchAction.icon ?? Icon.Stars }}
                      shortcut={actions.alternateSearchAction.shortcut}
                    />

                    <Action.CopyToClipboard
                      title={actions.copySuggestionAction.title}
                      content={actions.copySuggestionAction.content ?? ""}
                      shortcut={actions.copySuggestionAction.shortcut}
                    />

                    <Action
                      title={actions.setSearchTextAction.title}
                      onAction={() => {
                        search(item.query);
                      }}
                      icon={{ source: actions.setSearchTextAction.icon ?? Icon.MagnifyingGlass }}
                      shortcut={actions.setSearchTextAction.shortcut}
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
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                      />
                    )}

                    <Action
                      title="Clear All History"
                      onAction={async () => {
                        await deleteAllHistory();
                      }}
                      icon={{ source: Icon.ExclamationMark }}
                      style={Action.Style.Destructive}
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
