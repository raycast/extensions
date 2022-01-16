import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";
import useSearch from "./hooks/useSearch";
import { SearchResult } from "./types/types";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const title = searchResult.kanji || searchResult.reading;
  return (
    <List.Item
      title={title}
      subtitle={searchResult.kanji ? searchResult.reading : ""}
      accessoryTitle={searchResult.definition.join(", ") || "No definition"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction title="Copy" content={title} shortcut={{ modifiers: ["cmd"], key: "." }} />
            {searchResult.reading && (
              <CopyToClipboardAction
                title="Copy Reading"
                content={searchResult.reading}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
