import { ActionPanel, List, Action } from "@raycast/api";
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
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={new URL(searchResult.url).href} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy" content={title} shortcut={{ modifiers: ["cmd"], key: "." }} />
            {searchResult.reading && (
              <Action.CopyToClipboard
                title="Copy Reading"
                content={searchResult.reading}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
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
