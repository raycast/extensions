import { ActionPanel, getPreferenceValues, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";

const APPID  = "E3MIRNPJH5";
const APIKEY = "1fa3a8fec06eb1858d6ca137211225c0";
const INDEX  = "laravel";

type AlgoliaHit = {
  url: string;
  hierarchy: {
    [key: string]: string;
  }
  objectID: string;
}

export default function main() {
  const preferences = getPreferenceValues();

  const algoliaClient = useMemo(() => {
    return algoliasearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const search = async (query = "") => {
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
          hitsPerPage: 11,
          facetFilters: ['version:' + preferences.laravelVersion]
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(ToastStyle.Failure, "Search Error", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  return (
    <List
      throttle={true}
      isLoading={isLoading || searchResults === undefined}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
    >
      {searchResults?.map((result: AlgoliaHit) => {
        const hierarchy:string[] = Object.values(result.hierarchy)
          .filter((hierarchyEntry: string|unknown) => hierarchyEntry)
          .map((hierarchyEntry: string) => hierarchyEntry.replaceAll('&amp;', '&'));

        return (
        <List.Item
          key={result.objectID}
          title={hierarchy.pop() || ''}
          subtitle={hierarchy.join(' > ')}
          icon="command-icon.png"
          actions={
            <ActionPanel title={result.url}>
              <OpenInBrowserAction url={result.url} title="Open in Browser" />
            </ActionPanel>
          }
        />
      )})}
    </List>
  );
}
