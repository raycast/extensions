import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { useSearchMemories } from "./hooks";
import { SearchResult } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { results, isLoading, error } = useSearchMemories(searchText, {
    execute: searchText.length > 0,
  });

  if (error) {
    return (
      <List>
        <List.Item title={`Error: ${error.message}`} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="What would you like to search for?"
      throttle
    >
      {searchText.length === 0 ? (
        <List.EmptyView title="Start typing to search" description="Enter a search query to find memories" />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView title="No results found" description={`No memories found for "${searchText}"`} />
      ) : (
        <List.Section title="Search Results" subtitle={`${results.length} results`}>
          {results.map((result: SearchResult) => (
            <List.Item
              key={result.id}
              title={result.memory || "No memory content"}
              subtitle={result.user_id || "Unknown user"}
              accessories={[
                { text: result.score ? `Score: ${result.score.toFixed(2)}` : undefined },
                { text: result.created_at ? new Date(result.created_at).toLocaleDateString() : undefined },
                { icon: Icon.Clipboard, tooltip: "Copy Memory" },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Memory"
                    content={result.memory || "No memory content"}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy All Results"
                    content={results.map((r: SearchResult) => r.memory || "No memory content").join("\n\n")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
