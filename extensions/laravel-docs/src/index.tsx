import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import striptags from "striptags";
import { VersionDropdown } from "./version_dropdown";
/* eslint-disable @typescript-eslint/no-var-requires */
const glob = require("glob"); // No ES version is provided.
/* eslint-enable @typescript-eslint/no-var-requires */

type docList = {
  [key: string]: {
    url: string;
    title: string;
  }[];
};

const DOCS: { [key: string]: docList } = Object.fromEntries(
  glob
    .sync(__dirname + "/assets/documentation/*.json")
    // only keep the version from the path as key, result: [['master', {...}], ['10.x', {...}]]
    .map((path: string) => [/(?<version>[^/]+)\.json/.exec(path)?.groups?.version, require(path)])
    // Sort these putting non-numeric "versions" first.
    .sort(function (a: [string], b: [string]) {
      const aVersion: RegExpMatchArray | null = a[0].match(/\d+/);
      const bVersion: RegExpMatchArray | null = b[0].match(/\d+/);
      if (aVersion === null) {
        return -1;
      }

      if (bVersion === null) {
        return 1;
      }

      return (bVersion[0] as unknown as number) - (aVersion[0] as unknown as number);
    })
);

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
  const algoliaClient = useMemo(() => {
    return algoliasearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [version, setVersion] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

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
    if (query === "") {
      return;
    }
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 11,
        facetFilters: ["version:" + version],
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Error searching Laravel Documentation", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  if (!version) {
    return (
      <List
        isLoading={isLoading}
        searchBarAccessory={<VersionDropdown id="version" versions={Object.keys(DOCS)} onChange={setVersion} />}
      />
    );
  }

  const currentDocs = DOCS[version];

  if (isLoading && Object.entries(currentDocs).length) {
    setIsLoading(false);
  }

  return (
    <List
      throttle={false}
      isLoading={isLoading}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
      searchBarAccessory={<VersionDropdown id="version" versions={Object.keys(DOCS)} onChange={setVersion} />}
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
