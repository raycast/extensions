/* eslint-disable @typescript-eslint/no-explicit-any */
import APIData from "../algolia/apiData";
import type { IAPIData } from "../algolia/types";
import { escape2Html } from "../utils";

import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import algoliasearch from "algoliasearch/lite";

export function SearchDocumentation(props: { docsName: string; lang?: string; quickSearch?: string }) {
  const currentAPI = APIData.find((api) =>
    props.lang ? api.name === props.docsName && api.lang === props.lang : api.name === props.docsName
  ) as IAPIData;

  const searchClient = algoliasearch(currentAPI.appId, currentAPI.apiKey);
  const searchIndex = searchClient.initIndex(currentAPI.indexName);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const search = async (query = "") => {
    setIsLoading(true);

    return await searchIndex
      .search(query, currentAPI.searchParameters)
      .then((res) => {
        setIsLoading(false);
        if (res.hits[0]) {
          if ("path" in res.hits[0]) {
            res.hits = res.hits.map((hit: any) => {
              hit.url = currentAPI.homepage + hit.path;

              return hit;
            });
          } else if ("slug" in res.hits[0]) {
            res.hits = res.hits.map((hit: any) => {
              hit.url = currentAPI.homepage + hit.slug;

              return hit;
            });
          } else if ("url" in res.hits[0] && !((res.hits[0] as any).url as string).startsWith("http")) {
            res.hits = res.hits.map((hit: any) => {
              hit.url = currentAPI.homepage + hit.url;

              return hit;
            });
          }
        }

        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Algolia Error", err.message);

        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search(props.quickSearch)))();
  }, []);

  const getTitle = (result: any) => {
    const combinedTitle = (titles: Array<string>) => titles.filter((itme) => itme).join(" > ");

    return escape2Html(
      combinedTitle(
        "path" in result || "slug" in result ? [result.title, result.description] : Object.values(result.hierarchy)
      )
    );
  };

  return (
    <List
      throttle={true}
      navigationTitle={currentAPI.name}
      isLoading={isLoading || searchResults === undefined}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
      searchText={props.quickSearch}
    >
      {searchResults?.map((result) => (
        <List.Item
          icon={currentAPI.icon}
          key={result.objectID}
          title={getTitle(result)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={result.url.indexOf("%") !== -1 ? result.url : encodeURI(result.url)}
                title="Open in Browser"
              />
              <Action.CopyToClipboard
                title="Copy URL"
                content={result.url.indexOf("%") !== -1 ? decodeURI(result.url) : result.url}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
