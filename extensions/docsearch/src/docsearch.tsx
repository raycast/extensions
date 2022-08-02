import APIData from "./algolia/apiData";
import type { IAPIData } from "./algolia/types";

import { ActionPanel, List, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import algoliasearch from "algoliasearch/lite";

function escape2Html(str: string) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot/g, "'");
}

function SearchDocumentation(props: { API: IAPIData }) {
  const currentAPI = props.API;
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

export default function ChooseSearchDocumentation() {
  const [currentAPIData, setCurrentAPIData] = useState<IAPIData[]>(APIData);
  const { push } = useNavigation();

  useEffect(() => {
    (() => setCurrentAPIData(APIData.filter((api) => api.name.toLowerCase().includes(""))))();
  }, []);

  return (
    <List
      throttle={true}
      navigationTitle="Documentations"
      searchBarPlaceholder="Choose a documentation"
      onSearchTextChange={(query) =>
        query
          ? setCurrentAPIData(APIData.filter((api) => api.name.toLowerCase().includes(query.toLowerCase())))
          : setCurrentAPIData(APIData)
      }
    >
      {currentAPIData?.map((API: IAPIData) => (
        <List.Item
          icon={API.icon}
          key={API.apiKey}
          title={API.name}
          subtitle={API.subtitle}
          actions={
            <ActionPanel>
              <Action
                title="Choose"
                onAction={() => {
                  push(<SearchDocumentation API={API} />);
                }}
              />
              <Action.OpenInBrowser url={API.homepage} title="Open in Browser" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
