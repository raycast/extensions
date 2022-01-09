import { ActionPanel, getPreferenceValues, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import striptags from "striptags";

const APPID = "E3MIRNPJH5";
const APIKEY = "1fa3a8fec06eb1858d6ca137211225c0";
const INDEX = "laravel";

type KeyValueHierarchy = {
  [key: string]: string;
};

type LaravelDocsHit = {
  url: string;
  hierarchy: KeyValueHierarchy;
  objectID: string;
  _highlightResult: {
    content:
      | {
          value: string;
          matchlevel: string;
          fullyHighlighted: boolean;
          matchedWords: string[];
        }
      | undefined;
    hierarchy: {
      [key: string]: {
        value: string;
        matchLevel: string;
        matchedWords: string[];
      };
    };
  };
};

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

  const hierarchyToArray = (hierarchy: KeyValueHierarchy) => {
    return Object.values(hierarchy)
      .filter((hierarchyEntry: string | unknown) => hierarchyEntry)
      .map((hierarchyEntry: string) => hierarchyEntry.replaceAll("&amp;", "&"));
  };

  const getTitle = (hit: LaravelDocsHit): string => {
    return hierarchyToArray(hit.hierarchy).pop() || "";
  };

  const getSubTitle = (hit: LaravelDocsHit): string => {
    const highlightResult = striptags(hit._highlightResult?.content?.value || "");
    if (highlightResult) {
      return highlightResult;
    }

    const hierarchy = hierarchyToArray(hit.hierarchy) || [];
    hierarchy.pop();
    return hierarchy.join(" > ");
  };

  const search = async (query = "") => {
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 11,
        facetFilters: ["version:" + preferences.laravelVersion],
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(ToastStyle.Failure, "Error searching Laravel Documentation", err.message);
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
      {searchResults?.map((hit: LaravelDocsHit) => {
        return (
          <List.Item
            key={hit.objectID}
            title={getTitle(hit)}
            subtitle={getSubTitle(hit)}
            icon="command-icon.png"
            actions={
              <ActionPanel title={hit.url}>
                <OpenInBrowserAction url={hit.url} title="Open in Browser" />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
