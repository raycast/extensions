import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { MeiliSearch } from "meilisearch";
import fetch from "node-fetch";
import { decode } from "html-entities";
import fallbackResults from "./../fallback-results.json";

type SearchResult = {
  id: string;
  hierarchy_lvl0: string;
  hierarchy_lvl1: string;
  search_content: string | null;
  url: string;
};

type SearchResultList = {
  [key: string]: SearchResult[];
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
  const [searchResults, setSearchResults] = useState<SearchResultList>({});

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
        if (!query) {
          setSearchResults(fallbackResults);
          return;
        }

        const results = (await search(query)) as SearchResult[];

        if (!results) {
          return;
        }

        setSearchResults(
          results.reduce((acc: SearchResultList, hit: SearchResult) => {
            const key = hit.hierarchy_lvl0 || "Other";

            if (!acc[key]) {
              acc[key] = [];
            }

            acc[key].push(hit);

            return acc;
          }, {})
        );
      }}
    >
      {Object.entries(searchResults as SearchResultList).map(
        ([section, items]: [string, SearchResult[]], index: number) => {
          return (
            <List.Section title={section} key={index}>
              {items.map((hit: SearchResult) => {
                const url = `https://statamic.dev${hit.url}`;
                return (
                  <List.Item
                    key={hit.id}
                    title={getTitle(hit)}
                    subtitle={getSubtitle(hit)}
                    icon="command-icon.png"
                    actions={
                      <ActionPanel title={url}>
                        <Action.OpenInBrowser url={url} title="Open in Browser" />
                        <Action.CopyToClipboard content={url} title="Copy URL" />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        }
      )}
    </List>
  );
}
