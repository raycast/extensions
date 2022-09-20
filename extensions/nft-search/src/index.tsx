import { Icon, ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError, Headers } from "node-fetch";

export default function Command() {
  const { state, search } = useSearch();
  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Type NFT name..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      accessoryTitle={searchResult.price + ", " + searchResult.one_day_floor_change}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Genie" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Contract Address"
              content={searchResult.address}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            {searchResult.website ? (
              <Action.OpenInBrowser title="Open Official Website in Browser" url={searchResult.website} />
            ) : null}
            {searchResult.twitter ? (
              <Action.OpenInBrowser
                title="Open Twitter in Browser"
                url={"https://www.twitter.com/" + searchResult.twitter}
                icon="twitter.png"
              />
            ) : null}
            {searchResult.discord ? (
              <Action.OpenInBrowser title="Open Discord in Browser" url={searchResult.discord} icon="discord.png" />
            ) : null}
            {searchResult.instagram ? (
              <Action.OpenInBrowser
                title="Open Instagram in Browser"
                url={"https://www.instagram.com/" + searchResult.instagram}
                icon="ig.png"
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      // disable search is there is no input
      if (!searchText || searchText == "") {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));
        return null;
      }
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        // console.error("search error", String(error));
        switch (String(error)) {
          case "Error: Search collections by using the contract address":
            showToast({
              style: Toast.Style.Failure,
              title: `Could not find the colleciton ${searchText}`,
              message: String(error),
            });
            break;
          default:
            showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
        }
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const searchName = searchText.trim();
  const raw =
    '{"filters":{"$or":[{"name":{"$regex":"' +
    searchName +
    '","$options":"i"}}]},"limit":10,"fields":{"name":1,"imageUrl":1,"address":1,"floorPrice":1},"offset":0}';

  const response = await fetch("https://v2.api.genie.xyz/searchCollections", {
    method: "POST",
    headers: {
      accept: " */*",
      "accept-encoding": " gzip, deflate, br",
      "accept-language": " en-US,en;q=0.9",
      "content-length": " 145",
      "content-type": " application/json",
    },
    body: raw,
    redirect: "follow",
  });
  const json = (await response.json()) as {
    code: number;
    status: string;
    error?: string;
    data: {
      address: string;
      name: string;
      description: string;
      externalUrl: string;
      discordUrl: string;
      twitter: string;
      instagram: string;
      stats: { floor_price: number; one_day_floor_change: number };
    }[];
  };
  if (json.status != "success" || json.code != 200 || json.error) {
    throw new Error(json.error);
  }
  // console.info(json.data);
  // console.info(searchText);

  // we can construct different address
  // https://genie.xyz/collection/${result.address}
  // https://genie.xyz/collection/${result.address}
  // https://opensea.io/assets/search[query]=${result.address}
  return json.data.map((result) => {
    return {
      name: result.name,
      description: result.description,
      price: result.stats.floor_price?.toString(),
      url: `https://genie.xyz/collection/${result.address}`,
      address: result.address,
      website: result.externalUrl,
      discord: result.discordUrl,
      twitter: result.twitter,
      instagram: result.instagram,
      one_day_floor_change: (result.stats.one_day_floor_change * 100).toFixed(1).toString() + "%",
    };
  });
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  description?: string;
  price?: string;
  url: string;
  address: string;
  one_day_floor_change: string;
  twitter?: string;
  discord?: string;
  website?: string;
  instagram?: string;
}
