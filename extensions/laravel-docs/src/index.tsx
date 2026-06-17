import { ActionPanel, List, Action, showToast, Toast, environment } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import striptags from "striptags";
import { VersionDropdown } from "./version_dropdown";
import path from "path";
import fs from "fs";

const docsPath = path.join(environment.assetsPath, "documentation");

const DOCS = Object.fromEntries(
  fs
    .readdirSync(docsPath)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const version = file.replace(".json", "");
      const content = JSON.parse(fs.readFileSync(path.join(docsPath, file), "utf-8"));
      return [version, content];
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

type DocsItem = {
  url: string;
  title: string;
};

type DocsSection = {
  [section: string]: DocsItem[];
};

export default function main() {
  const algoliaClient = useMemo(() => {
    return algoliasearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchResults, setSearchResults] = useState<LaravelDocsHit[] | undefined>();
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

  const sortedVersions = Object.keys(DOCS).sort((a, b) => {
    if (!/\d/.test(a)) return -1;
    if (!/\d/.test(b)) return 1;

    const parse = (v: string) =>
      v
        .match(/\d+(\.\d+)?/g)?.[0]
        .split(".")
        .map(Number) ?? [];

    const av = parse(a);
    const bv = parse(b);

    const length = Math.max(av.length, bv.length);

    for (let i = 0; i < length; i++) {
      const diff = (bv[i] ?? 0) - (av[i] ?? 0);
      if (diff !== 0) return diff;
    }

    return 0;
  });

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
        return res.hits as LaravelDocsHit[];
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Error searching Laravel Documentation", err.message);
        return [] as LaravelDocsHit[];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  if (!version) {
    return (
      <List
        isLoading={isLoading}
        searchBarAccessory={<VersionDropdown id="version" versions={sortedVersions} onChange={setVersion} />}
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
      searchBarAccessory={<VersionDropdown id="version" versions={sortedVersions} onChange={setVersion} />}
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
        Object.entries(currentDocs as DocsSection).map(([section, items]) => {
          return (
            <List.Section title={section} key={section}>
              {items.map((item: DocsItem) => {
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
