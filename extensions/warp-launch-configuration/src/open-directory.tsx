import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useRef, useState } from "react";
import os from "node:os";
import spotlight from "node-spotlight";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const abortable = useRef<AbortController>();

  const maxResults = 250;

  const { isLoading } = usePromise(
    async (query) => {
      if (searchText === "") {
        setResults([]);
        return [];
      }

      const results = await spotlight(query);

      setResults([]);

      let resultsCount = 0;

      for await (const result of results) {
        setResults((state) => [...state, { name: result.path.replace(os.homedir(), "~"), path: result.path }]);

        resultsCount++;

        if (resultsCount >= maxResults) {
          abortable?.current?.abort();
          break;
        }
      }
    },
    [`kind:folders ${searchText}`],
    {
      abortable,
    }
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Searching directories..."
      throttle={true}
    >
      {searchText !== "" ? (
        <List.EmptyView title="No directories found" description="Try refining your search" />
      ) : null}
      {searchText === "" ? (
        <List.EmptyView title="Search for a directory" description="Open a directory on your computer in Warp" />
      ) : null}
      <List.Section title="Results">
        {results.map((searchResult) => (
          <SearchListItem key={searchResult.path} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={Icon.Terminal}
              title="Open in New Warp Tab"
              url={`warp://action/new_tab?path=${encodeURIComponent(searchResult.path)}`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in New Warp Window"
              url={`warp://action/new_window?path=${encodeURIComponent(searchResult.path)}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.CreateQuicklink
              quicklink={{ link: `warp://action/new_tab?path=${encodeURIComponent(searchResult.path)}` }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface SearchResult {
  name: string;
  path: string;
}
