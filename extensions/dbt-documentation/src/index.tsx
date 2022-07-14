import { ActionPanel, getPreferenceValues, List, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";

const APPID = "57ZWAOQC7F";
const APIKEY = "04a5092253f5120fdff2c77b3847d0e1";
const INDEX = "dbt";

export default function main() {
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
      .search(query)
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
      isLoading={isLoading || searchResults === undefined}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
    >
      {searchResults?.map((result) => (
        <List.Item
          key={result.objectID}
          title={result.hierarchy.lvl1 ? result.hierarchy.lvl1.replace("'", "'") : ""}
          subtitle={result.hierarchy.lvl0}
          actions={
            <ActionPanel title={result.name}>
              <Action.OpenInBrowser url={result.url} title="Open in Browser" />
              <Action.CopyToClipboard content={result.url} title="Copy URL" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
