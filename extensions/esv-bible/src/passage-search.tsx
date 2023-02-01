import { useEffect, useState } from "react";
import crypto from "crypto";

// Raycast imports
import {
  Action,
  ActionPanel,
  getPreferenceValues,
  List,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  Cache,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

// types
import { SearchResponse, Preferences, Search } from "./types";

// get user Prefs
const { ESVApiToken } = getPreferenceValues<Preferences>();

const cache = new Cache({ namespace: "bible-search", capacity: 1000000 });

export default function EsvSearch() {
  const cached = cache.get("bible-search");
  const prevItems = cached ? JSON.parse(cached) : [];
  const [query, setQuery] = useState("");
  const { isLoading, data: passages } = useFetch<SearchResponse>(`https://api.esv.org/v3/passage/search/?q=${query}`, {
    method: "GET",
    headers: {
      Authorization: `${ESVApiToken}`,
    },
    keepPreviousData: true,
    onError: (error: Error) => {
      if (query.length !== 0) {
        showToast({
          style: Toast.Style.Failure,
          title: `${error} Check your API Key`,
          message: `Your ESV API token is invalid or you have no internet connection.`,
          primaryAction: {
            title: "Change API Key",
            onAction: () => openExtensionPreferences(),
          },
        });
      }
    },
  });

  const [searchResult, setSearchResult] = useState<Search | undefined>(undefined);

  const clearCache = () => {
    cache.clear();
    setSearchResult(undefined);
    cache.set("bible-search", JSON.stringify([]));
    showToast({
      style: Toast.Style.Success,
      title: `Previous searches removed`,
    });
  };

  useEffect(() => {
    if (passages) {
      const passageObject = {
        id: crypto.randomUUID(),
        q: query,
        refs: passages.results.map((i) => i.reference).join(","),
        results: passages.results
          .map(
            (i) => `
## ${i.reference}
${i.content}
        `
          )
          .join(""),
      };
      setSearchResult(passageObject);
      const resultExists = prevItems.some((item: Search) => item.q === passageObject.q);
      if (!resultExists && passages.results.length !== 0) {
        cache.set("bible-search", JSON.stringify([passageObject, ...prevItems]));
      }
    }
  }, [passages]);

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search for a Bible word or phrase..."
      isShowingDetail={prevItems.length > 0}
      selectedItemId={searchResult?.id}
      throttle={true}
    >
      {!query && prevItems.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search"
          description="Provide a word or phrase (e.g., “Jesus sea of Galilee”)"
        />
      )}
      {searchResult && searchResult?.results?.length !== 0 && prevItems.length > 0 && (
        <List.Section title="Current Search">
          <List.Item
            title={searchResult.q}
            icon={Icon.MagnifyingGlass}
            id="1"
            detail={<List.Item.Detail markdown={searchResult.results} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open at ESV.org"
                  url={`https://esv.org/${encodeURIComponent(searchResult.refs)}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard title="Copy Search Results" content={searchResult.results} />
                <Action.Paste
                  title="Paste Search Results"
                  content={searchResult.results}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
                <Action
                  title="Clear Previous Searches"
                  onAction={clearCache}
                  icon={Icon.Eraser}
                  shortcut={{ modifiers: ["opt"], key: "backspace" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {searchResult &&
        searchResult?.results?.length === 0 &&
        (prevItems.length === 0 ? (
          <List.EmptyView
            icon={Icon.XMarkCircle}
            title="No result found"
            description="Please try another search (e.g., “Jesus sea of Galilee”)"
          />
        ) : (
          <List.Section title="No result found">
            <List.Item title="Please try another search" icon={Icon.XMarkCircle} />
          </List.Section>
        ))}
      <List.Section title="Previous Searches">
        {prevItems
          .filter((i: Search) => i.q !== searchResult?.q)
          .map((item: Search) => (
            <List.Item
              key={item.id}
              title={item.q}
              icon={Icon.MagnifyingGlass}
              detail={<List.Item.Detail markdown={item.results} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open at ESV.org"
                    url={`https://esv.org/${encodeURIComponent(item.refs)}`}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard title="Copy Search Results" content={item.results} />
                  <Action.Paste
                    title="Paste Search Results"
                    content={item.results}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                  <Action
                    title="Clear Previous Searches"
                    onAction={clearCache}
                    icon={Icon.Eraser}
                    shortcut={{ modifiers: ["opt"], key: "backspace" }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
