import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";
import { useDebounce } from "@uidotdev/usehooks";

const Command = () => {
  const API = "https://itunes.apple.com/search?media=software&entity=macSoftware";
  const [searchText, setSearchText] = useState("");
  const debouncedSearchTerm = useDebounce(searchText, 1000);

  const queryUrl =
    debouncedSearchTerm.length === 0 ? "" : API + "&" + new URLSearchParams({ term: debouncedSearchTerm });

  const { data, isLoading } = useFetch(queryUrl, {
    execute: queryUrl !== "",
    parseResponse: parseFetchResponse,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Mac App Store..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => <SearchListItem key={searchResult.id} searchResult={searchResult} />)}
      </List.Section>
    </List>
  );
};

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[{ icon: Icon.Person, text: searchResult.sellerName, tooltip: searchResult.sellerName }]}
      icon={searchResult.icon ? { source: searchResult.icon } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in App Store" url={searchResult.url} />
            <Action.CopyToClipboard
              title="Copy URL to Clipboard"
              content={searchResult.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            {searchResult.artist ? (
              <Action.OpenInBrowser
                title="Open Author Page in App Store"
                url={searchResult.artist}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as {
    results: {
      bundleId: string;
      trackName: string;
      description?: string;
      sellerName?: string;
      trackViewUrl: string;
      artistViewUrl?: string;
      artworkUrl60?: string;
    }[];
  };

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return json.results.map((result) => {
    return {
      id: result.bundleId,
      name: result.trackName,
      description: result.description,
      sellerName: result.sellerName,
      url: result.trackViewUrl,
      artist: result.artistViewUrl,
      icon: result.artworkUrl60,
    } as SearchResult;
  });
}

interface SearchResult {
  id: string;
  name: string;
  description?: string;
  sellerName?: string;
  url: string;
  artist?: string;
  icon?: string;
}

export default Command;
