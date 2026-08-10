import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState } from "react";
import type { HistoryEntry } from "./types";
import { CreateQuicklinkAction, ReloadAction } from "./utils/actions";
import { useHistorySearch } from "./utils/history";
import { extractDomain, normalizeURL } from "./utils/url";

export default function SearchHistory(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { data: history, isAvailable, isLoading, permissionView, revalidate } = useHistorySearch(searchText, 25);

  if (permissionView) {
    return permissionView;
  }

  const isSearching = searchText.trim().length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search browsing history..."
      throttle
    >
      {!isAvailable && !isLoading && (
        <List.EmptyView
          icon={Icon.Clock}
          title="History unavailable"
          description="No readable Helium History database was found"
        />
      )}

      {isAvailable && history.length === 0 && !isLoading && isSearching && (
        <List.EmptyView icon={Icon.Clock} title="No history found" />
      )}

      {isAvailable && history.length === 0 && !isLoading && !isSearching && (
        <List.EmptyView icon={Icon.Clock} title="No recent history" />
      )}

      {history.length > 0 && (
        <List.Section
          title={isSearching ? "History" : "Recent History"}
          subtitle={`${history.length} entr${history.length !== 1 ? "ies" : "y"}`}
        >
          {history.map((entry) => (
            <HistoryListItem key={entry.id} entry={entry} revalidate={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function HistoryListItem({ entry, revalidate }: { entry: HistoryEntry; revalidate: () => Promise<unknown> | void }) {
  const domain = extractDomain(entry.url);

  return (
    <List.Item
      title={entry.title}
      subtitle={domain}
      keywords={[entry.url, entry.title]}
      icon={getFavicon(entry.url, { fallback: Icon.Globe })}
      accessories={[{ text: new Date(entry.lastVisitedAt).toLocaleDateString() }]}
      actions={
        <ActionPanel>
          <Action.Open title="Open in Helium" target={normalizeURL(entry.url)} application="net.imput.helium" />
          <Action.CopyToClipboard title="Copy URL" content={entry.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={`[${entry.title}](${entry.url})`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <CreateQuicklinkAction url={entry.url} name={entry.title} />
          <ReloadAction subject="History" revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
