import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import striptags from "striptags";

type docList = {
  [key: string]: {
    url: string;
    title: string;
  }[];
};

const DOCS: { [key: string]: docList } = {
  "3.x": require("./documentation/3.x.json"),
};

const APPID = "BH4D9OD16A";
const APIKEY = "b5e8f73c7462a6d5c8b525ef183aabec";
const INDEX = "statamic_3";

type KeyValueHierarchy = {
  [key: string]: string;
};

type StatamicDocsHit = {
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

  const getTitle = (hit: StatamicDocsHit): string => {
    return hierarchyToArray(hit.hierarchy).pop() || "";
  };

  const getSubTitle = (hit: StatamicDocsHit): string => {
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
        hitsPerPage: 20,
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Error searching Statamic Documentation", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  const currentDocs = DOCS["3.x"];

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
    >
      {searchResults?.map((hit: StatamicDocsHit) => {
        return (
          <List.Item
            key={hit.objectID}
            title={getTitle(hit)}
            subtitle={getSubTitle(hit)}
            icon="command-icon.png"
            actions={
              <ActionPanel title={hit.url}>
                <Action.OpenInBrowser url={hit.url} title="Open in Browser" />
                <Action.CopyToClipboard content={hit.url} title="Copy URL" />
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
                    icon="command-icon.png"
                    actions={
                      <ActionPanel title={item.url}>
                        <Action.OpenInBrowser url={item.url} title="Open in Browser" />
                        <Action.CopyToClipboard content={item.url} title="Copy URL" />
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
