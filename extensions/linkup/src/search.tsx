import { Action, ActionPanel, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { getFavicon, showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { PageDetail } from "./components/page-detail";
import { formatLinkupError, getHostname, searchResults } from "./linkup";

export default function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const [searchText, setSearchText] = useState(props.arguments.query?.trim() ?? "");
  const query = searchText.trim();

  const { data, isLoading } = usePromise(searchResults, [query], {
    execute: query.length > 0,
    onError: (error) => {
      showFailureToast(error, { title: "Search failed", message: formatLinkupError(error) });
    },
  });

  const results = query ? (data ?? []) : [];

  return (
    <List
      isLoading={isLoading && query.length > 0}
      isShowingDetail={results.length > 0}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search the web with Linkup..."
      throttle
    >
      <List.EmptyView
        icon={query ? Icon.MagnifyingGlass : { source: "icon.png" }}
        title={query ? (isLoading ? "Searching..." : "No Results") : "Search the Web with Linkup"}
        description={query ? undefined : "Type a query to get relevant, citable sources."}
      />
      {results.map((result, index) => (
        <List.Item
          key={`${result.url}-${index}`}
          title={result.name || getHostname(result.url)}
          icon={getFavicon(result.url, { fallback: Icon.Globe })}
          detail={
            <List.Item.Detail
              markdown={`## ${result.name || getHostname(result.url)}\n\n[${getHostname(result.url)}](${result.url})\n\n${result.content}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={result.url} />
              <Action.Push
                title="Fetch Page as Markdown"
                icon={Icon.Document}
                target={<PageDetail url={result.url} />}
              />
              <Action.CopyToClipboard title="Copy URL" content={result.url} shortcut={Keyboard.Shortcut.Common.Copy} />
              <Action.CopyToClipboard title="Copy Content" content={result.content} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
