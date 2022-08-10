import APIData from "../algolia/APIData";
import type { IAPIData } from "../algolia/types";
import { escape2Html } from "../utils";

import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import algoliasearch from "algoliasearch/lite";

export function SearchDocumentation(props: { docsName: string; lang?: string }) {
  const currentAPI = APIData.find((api) =>
    props.lang ? api.name === props.docsName && api.lang === props.lang : api.name === props.docsName
  ) as IAPIData;
  const searchClient = algoliasearch(currentAPI.appId, currentAPI.apiKey);
  const searchIndex = searchClient.initIndex(currentAPI.indexName);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const search = async (query = "") => {
    setIsLoading(true);

    return await searchIndex
      .search(query, currentAPI.searchParameters)
      .then((res) => {
        setIsLoading(false);

        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Algolia Error", err.message);

        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  return (
    <List
      throttle={true}
      navigationTitle={currentAPI.name}
      isLoading={isLoading || searchResults === undefined}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
    >
      {searchResults?.map((result) => (
        <List.Item
          icon={currentAPI.icon}
          key={result.objectID}
          title={escape2Html(
            Object.values(result.hierarchy)
              .filter((item) => item)
              .join(" > ")
          )}
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
