import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List, open } from "@raycast/api";
import { getIcon, getItemAiUrl, getItemNormalUrl } from "./utils/resultUtils";
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
    const normalUrl = getItemNormalUrl(item);
    await addHistory({ ...item, url: normalUrl });
    await open(normalUrl);
    await closeMainWindow();
  };

  const handleOpenAi = async (item: SearchResult) => {
    const aiUrl = getItemAiUrl(item);
    await addHistory({ ...item, url: getItemNormalUrl(item) });
    await open(aiUrl);
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
          const normalUrl = getItemNormalUrl(item);
          const aiUrl = getItemAiUrl(item);
          const copyUrl = isAiMode ? aiUrl : normalUrl;

          return (
            <List.Item
              key={item.id}
              title={item.query}
              subtitle={item.description}
              icon={getIcon(item)}
              accessories={[
                isAiMode
                  ? { icon: Icon.ArrowRight, tooltip: "Open in Browser (⇧↵)" }
                  : { icon: Icon.Stars, tooltip: "Search in AI Mode (⇧↵)" },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Result">
                    {isAiMode ? (
                      <Action
                        title="Search in AI Mode"
                        onAction={() => handleOpenAi(item)}
                        icon={{ source: Icon.Stars }}
                      />
                    ) : (
                      <Action
                        title="Open in Browser"
                        onAction={() => handleOpenNormal(item)}
                        icon={{ source: Icon.ArrowRight }}
                      />
                    )}

                    <Action.CopyToClipboard
                      title="Copy URL to Clipboard"
                      content={copyUrl}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "return" },
                        Windows: { modifiers: ["ctrl"], key: "return" },
                      }}
                    />

                    {isAiMode ? (
                      <Action
                        title="Open in Browser"
                        onAction={() => handleOpenNormal(item)}
                        icon={{ source: Icon.ArrowRight }}
                        shortcut={{ modifiers: ["shift"], key: "return" }}
                      />
                    ) : (
                      <Action
                        title="Search in AI Mode"
                        onAction={() => handleOpenAi(item)}
                        icon={{ source: Icon.Stars }}
                        shortcut={{ modifiers: ["shift"], key: "return" }}
                      />
                    )}

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
