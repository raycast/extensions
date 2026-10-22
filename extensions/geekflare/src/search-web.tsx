import { Action, ActionPanel, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";

import { callGeekflare, type SearchResult, toSearchResults } from "./geekflare";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchWeb }>) {
  const [query, setQuery] = useState(props.arguments.query ?? "");

  const { data: results = [], isLoading } = usePromise(
    async (q: string): Promise<SearchResult[]> => {
      if (!q.trim()) return [];
      return toSearchResults(await callGeekflare("search", { query: q.trim(), limit: 10 }));
    },
    [query],
    {
      onError: (error) => {
        void showFailureToast(error, { title: "Search failed" });
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search the web with Geekflare"
      isShowingDetail={results.length > 0}
    >
      {query.trim() === "" ? (
        <List.EmptyView icon="icon.png" title="Type a query to search the web" />
      ) : (
        results.map((result) => (
          <List.Item
            key={result.url}
            title={result.title || result.url}
            icon={Icon.Globe}
            detail={<List.Item.Detail markdown={`## ${result.title}\n\n${result.snippet}\n\n${result.url}`} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={result.url} />
                <Action.CopyToClipboard title="Copy URL" content={result.url} />
                <Action.CopyToClipboard
                  title="Copy as Markdown Link"
                  content={`[${result.title}](${result.url})`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
