import { ActionPanel, closeMainWindow, Action, Icon, List, open, Keyboard, getPreferenceValues } from "@raycast/api";
import { getIcon } from "./utils/resultUtils";
import { useSearch } from "./utils/useSearch";

export default function Command() {
  const {
    isLoading,
    results,
    searchText,
    setSearchText,
    search,
    pauseSuggestions,
    setPauseSuggestions,
    addHistory,
    deleteAllHistory,
    deleteHistoryItem,
  } = useSearch();
  const preferences = getPreferenceValues<Preferences>();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={search}
      onSelectionChange={async (query) => {
        const selectedItem = results.find((item) => item.query === query);

        // when there is no history, or when there is no searchText
        if (!selectedItem || !searchText) return;

        // this is true when the user has manually changed the searchText
        // because otherwise, selectedItem.query would have been changed along with searchText
        if (searchText !== selectedItem.query) {
          // then, we want to pause suggestions so that user can still switch to other suggestions
          // from the original searchText
          setPauseSuggestions(true);
          // and then set the search text to the query
          setSearchText(selectedItem.query);
        }
      }}
      searchText={searchText}
      searchBarPlaceholder="Search Google or enter a URL..."
    >
      <List.Section title="Results" subtitle={results.length.toString()}>
        {results.map((item) => (
          <List.Item
            id={item.query}
            key={item.query}
            title={item.query}
            subtitle={preferences.showSearchDescription ? item.description : undefined}
            icon={getIcon(item)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Result">
                  <Action
                    title="Open in Browser"
                    onAction={async () => {
                      await addHistory(item);
                      await open(item.url);
                      await closeMainWindow();
                    }}
                    icon={{ source: Icon.ArrowRight }}
                  />
                  {/* <Action title="Autocomplete" onAction={() => setSearchText(item.query)} /> */}

                  <Action.CopyToClipboard
                    title="Copy URL to Clipboard"
                    content={item.url}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Suggestion to Clipboard"
                    content={item.query}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="History">
                  {item.isHistory && (
                    <Action
                      style={Action.Style.Destructive}
                      title="Remove From History"
                      onAction={async () => {
                        await deleteHistoryItem(item);
                      }}
                      icon={{ source: Icon.Trash }}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                  )}

                  <Action
                    title="Clear All History"
                    style={Action.Style.Destructive}
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
        ))}
      </List.Section>
    </List>
  );
}
