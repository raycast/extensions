import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { MeiliSearch } from "meilisearch";
import fetch from "node-fetch";
import { decode } from "html-entities";

type SearchResult = {
  id: string;
  hierarchy_lvl0: string;
  hierarchy_lvl1: string;
  search_content: string;
  url: string;
};

const client = new MeiliSearch({
  host: "https://search.statamic.dev",
  apiKey: "a8b8f82076221f9595dceca971be29c36cbccd772de5dbdb7f43dfac41557f95",
  httpClient: async (url, opts) => {
    const response = await fetch(url, {
      method: opts?.method?.toLocaleUpperCase() ?? "GET",
      headers: opts?.headers,
      body: opts?.body,
    });

    return response.json();
  },
});

const index = client.index("default");

export default function main() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const getTitle = (hit: SearchResult): string => {
    return hit.hierarchy_lvl1 || hit.hierarchy_lvl0 || "";
  };

  const getSubtitle = (hit: SearchResult): string => {
    return decode(hit.search_content || "");
  };

  const search = async (query = "") => {
    if (query === "") {
      return;
    }

    return await index
      .search(query, {
        hitsPerPage: 20,
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits as SearchResult[];
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Failed to search the Statamic documentation", err.message);
        return [];
      });
  };

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={async (query) => {
        const results = (await search(query)) as SearchResult[];
        setSearchResults(results);
      }}
    >
      {searchResults?.map((hit: SearchResult): React.ReactNode => {
        return (
          <List.Item
            key={hit.id}
            title={getTitle(hit)}
            subtitle={getSubtitle(hit)}
            icon="command-icon.png"
            actions={
              <ActionPanel title={`https://statamic.dev${hit.url}`}>
                <Action.OpenInBrowser url={`https://statamic.dev${hit.url}`} title="Open in Browser" />
                <Action.CopyToClipboard content={`https://statamic.dev${hit.url}`} title="Copy URL" />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
