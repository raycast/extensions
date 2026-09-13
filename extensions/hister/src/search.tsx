import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { searchHister } from "./hister";

function safeHostname(urlStr: string): string {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return "";
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const abortable = useRef<AbortController>(null);
  const prefs = getPreferenceValues<Preferences.Search>();
  const parsedLimit = Number.parseInt(prefs.maxResults ?? "50", 10);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.max(parsedLimit, 1), 200) : 50;

  const { isLoading, data: results = [], error, revalidate } = usePromise(
    (q: string, l: number) => searchHister(q, l, abortable.current?.signal),
    [searchText, limit],
    { abortable }
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history or domain:github.com..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search Failed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} />
              <Action.OpenInBrowser title="Open Hister Dashboard" url="http://127.0.0.1:4433" />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={isLoading ? "Searching Hister..." : "No History Found"}
          description={
            isLoading
              ? "Querying local Hister index"
              : "No matching documents found. Make sure 'hister listen' is running."
          }
        />
      )}

      {results.map((doc) => {
        const time = doc.updated || doc.added;
        const date = time ? new Date(time * 1000) : undefined;
        const title = doc.title.trim() || doc.url;
        const domain = doc.domain || safeHostname(doc.url);

        return (
          <List.Item
            key={doc.id || doc.url}
            title={title}
            subtitle={domain}
            icon={getFavicon(doc.url, { fallback: Icon.Globe })}
            accessories={
              date && !Number.isNaN(date.getTime())
                ? [{ date, tooltip: `Visited: ${date.toLocaleString()}` }]
                : []
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={doc.url} />
                  <Action.CopyToClipboard title="Copy URL" content={doc.url} />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Hister">
                  <Action.OpenInBrowser
                    title="Open Hister Dashboard"
                    url="http://127.0.0.1:4433"
                    shortcut={{ modifiers: ["cmd", "opt"], key: "h" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
