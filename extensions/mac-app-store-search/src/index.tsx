import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";
import { useDebounce } from "@uidotdev/usehooks";

const Command = () => {
  const API = "https://itunes.apple.com/search?media=software&entity=software";
  const [searchText, setSearchText] = useState("");
  const debouncedSearchTerm = useDebounce(searchText, 1000);

  const queryUrl =
    debouncedSearchTerm.length === 0 ? "" : API + "&" + new URLSearchParams({ term: debouncedSearchTerm });

  const { data, isLoading } = useFetch(queryUrl, {
    execute: queryUrl !== "",
    parseResponse: parseFetchResponse,
  });

  console.log(searchText, queryUrl);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Mac App Store..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => <SearchListItem key={searchResult.name} searchResult={searchResult} />)}
      </List.Section>
    </List>
  );
};

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[{ text: searchResult.sellerName }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in App Store" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={searchResult.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
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
      trackName: string;
      description?: string;
      sellerName?: string;
      trackViewUrl: string;
    }[];
  };

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return json.results.map((result) => {
    return {
      name: result.trackName,
      description: result.description,
      sellerName: result.sellerName,
      url: result.trackViewUrl,
    } as SearchResult;
  });
}

interface SearchResult {
  name: string;
  description?: string;
  sellerName?: string;
  url: string;
}

export default Command;
