import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import fetch from "node-fetch";
import { useCallback, useState } from "react";
import { useQuery } from "./lib/api";
import { getPreferences } from "./lib/preferences";

interface SearchResult {
  channelId: string;
  channelName: string;
}

export default function Command() {
  const { isLoading, results, search } = useSearch();

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search channels..." throttle>
      <List.Section title="Channels" subtitle={results.length + ""}>
        {results.map((searchResult) => (
          <SearchListItem key={searchResult.channelId} result={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ result }: { result: SearchResult }) {
  return (
    <List.Item
      title={result.channelName}
      subtitle={result.channelId}
      icon={Icon.Circle}
      actions={
        <ActionPanel>
          <OpenActions channelId={result.channelId} secondaryShortcut={{ modifiers: ["cmd"], key: "enter" }} />
        </ActionPanel>
      }
    />
  );
}

function OpenActions({
  channelId,
  primaryShortcut,
  secondaryShortcut,
}: {
  channelId: string;
  primaryShortcut?: Keyboard.Shortcut;
  secondaryShortcut?: Keyboard.Shortcut;
}) {
  const { preferYouTube } = getPreferences();

  const Holodex = ({ shortcut }: { shortcut?: Keyboard.Shortcut }) => (
    <Action.OpenInBrowser
      title="Open in Holodex"
      url={`https://holodex.net/channel/${channelId}`}
      icon={{ source: "holodex.png" }}
      shortcut={shortcut}
    />
  );

  const YouTube = ({ shortcut }: { shortcut?: Keyboard.Shortcut }) => (
    <Action.OpenInBrowser
      title="Open in YouTube"
      url={`https://www.youtube.com/channel/${channelId}`}
      icon={{ source: "yt.png" }}
      shortcut={shortcut}
    />
  );

  return (
    <>
      <ActionPanel.Section>
        {preferYouTube ? (
          <>
            <YouTube shortcut={primaryShortcut} />
            <Holodex shortcut={secondaryShortcut} />
          </>
        ) : (
          <>
            <Holodex shortcut={primaryShortcut} />
            <YouTube shortcut={secondaryShortcut} />
          </>
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          content={channelId}
          title="Copy Channel ID"
          shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
        />
        <Action.CopyToClipboard
          content={
            preferYouTube ? `https://www.youtube.com/channel/${channelId}` : `https://holodex.net/channel/${channelId}`
          }
          title="Copy Channel URL"
          shortcut={{ key: "c", modifiers: ["cmd", "ctrl"] }}
        />
      </ActionPanel.Section>
    </>
  );
}

function useSearch() {
  const [query, setQuery] = useState<string>();

  const { isLoading, data } = useQuery((signal) => performSearch(signal, query), [query]);

  const search = useCallback((query: string) => {
    setQuery(query);
  }, []);

  return {
    isLoading,
    search,
    results: data || [],
  };
}

async function performSearch(signal: AbortSignal, query?: string): Promise<SearchResult[]> {
  if (!query || query.length === 0) return [];

  const { apiKey } = getPreferences();

  const params = new URLSearchParams({
    q: query,
  });

  const response = (await fetch("https://holodex.net/api/v2/search/autocomplete?" + params.toString(), {
    headers: {
      "X-APIKEY": apiKey,
    },
    signal,
  }).then((res) => res.json())) as { type: string; value: string; text: string }[];

  return response
    .filter((item) => item.type === "channel")
    .map((item) => {
      return {
        channelId: item.value,
        channelName: item.text,
      };
    });
}
