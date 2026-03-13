import {
  ActionPanel,
  CopyToClipboardAction,
  getPreferenceValues,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliaSearch from "algoliasearch/lite";
import striptags from "striptags";

type docList = {
  [versions: string]: {
    title: string;
    url: string;
  }[];
};

const documentation: { [key: string]: docList } = {
  "v1.x": require("./documentation/v1.x.json"),
};

const APPID = "BH4D9OD16A";
const APIKEY = "ea9f3351550104420cd3c7b4e2b9b7b1";
const INDEX = "inertiajs";

type KeyValueHierarchy = {
  [key: string]: string;
};

type InertiaJSDocsHit = {
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

export default function SearchDocumentation() {
  const getPreference = getPreferenceValues();

  const algoliaClient = useMemo(() => {
    return algoliaSearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const hierarchyToArray = (hierarchy: KeyValueHierarchy) => {
    return Object.values(hierarchy)
      .filter((hierarchyEntry: string | unknown) => hierarchyEntry)
      .map((hierarchyEntry: string) => hierarchyEntry.replace("&amp;", "&"));
  };

  const getTitle = (hit: InertiaJSDocsHit): string => {
    return hierarchyToArray(hit.hierarchy).pop() || "";
  };

  const getSubTitle = (hit: InertiaJSDocsHit): string => {
    const highlightResult = striptags(hit._highlightResult?.content?.value || "");
    if (highlightResult) {
      return highlightResult;
    }

    const hierarchy = hierarchyToArray(hit.hierarchy) || [];
    hierarchy.pop();
    return hierarchy.join(" > ");
  };

  const search = async (query = "") => {
    if (query === "") {
      return;
    }
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 11,
        // facetFilters: ["version:" + getPreference.inertiajsVersion],
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(ToastStyle.Failure, "Error searching InertiaJS Documentation", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  const currentDocs = documentation[getPreference.inertiajsVersion];
  return (
    <List
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
    >
      {searchResults?.map((hit: InertiaJSDocsHit) => {
        return (
          <List.Item
            key={hit.objectID}
            title={getTitle(hit)}
            subtitle={getSubTitle(hit)}
            icon="inertiajs-icon.png"
            actions={
              <ActionPanel title={hit.url}>
                <OpenInBrowserAction url={hit.url} title="Open in Browser" />
                <CopyToClipboardAction content={hit.url} title="Copy URL" />
              </ActionPanel>
            }
          />
        );
      }) ||
        Object.entries(currentDocs).map(([section, items]: Array<any>) => {
          return (
            <List.Section title={section} key={section}>
              {items.map((item: any) => {
                return (
                  <List.Item
                    key={item.url}
                    title={item.title}
                    icon="inertiajs-icon.png"
                    actions={
                      <ActionPanel title={item.url}>
                        <OpenInBrowserAction url={item.url} title="Open in Browser" />
                        <CopyToClipboardAction content={item.url} title="Copy URL" />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
    </List>
  );
}
