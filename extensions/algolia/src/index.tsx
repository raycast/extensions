import { ActionPanel, getPreferenceValues, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";

export default function main() {
  const preferences = getPreferenceValues();

  const algoliaClient = useMemo(() => {
    return algoliasearch(preferences.appId, preferences.apiKey);
  }, [preferences.appId, preferences.apiKey]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(preferences.indexName);
  }, [algoliaClient, preferences.indexName]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const search = async (query = "") => {
    setIsLoading(true);

    return await algoliaIndex
      .search(query)
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(ToastStyle.Failure, "Algolia Error", err.message);
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
      {searchResults?.map((result) => (
        <List.Item
          key={result.objectID}
          title={result[preferences.mainAttribute]}
          subtitle={preferences.secondaryAttribute ? result[preferences.secondaryAttribute] : undefined}
          actions={
            preferences.urlAttribute ? (
              <ActionPanel title={result.name}>
                <OpenInBrowserAction url={result.url} title="Open in Browser" />
              </ActionPanel>
            ) : undefined
          }
        />
      ))}
    </List>
  );
}
