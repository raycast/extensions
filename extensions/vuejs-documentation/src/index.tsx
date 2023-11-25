import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import striptags from "striptags";
import groupBy from "lodash.groupby";
import { DocumentationList } from "./documentation_list";
import { VersionDropdown } from "./version_dropdown";
const APPID = "ML0LEBN7FQ";
const APIKEY = "f49cbd92a74532cc55cfbffa5e5a7d01";
const INDEX = "vuejs";

type KeyValueHierarchy = {
  [key: string]: string;
};

type VueJsDocsHit = {
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

enum LSKeys {
  VueVersion = "vueVersion",
}

type SectionHit = {
  section: string;
  items: VueJsDocsHit[];
};

type DocLink = {
  title: string;
  url: string;
};

export type DocList = {
  section: {
    title: string;
    items: DocLink[];
  };
};

const DOCS: { [key: string]: DocList[] } = {
  v3: require("./documentation/v3.json"),
  v2: require("./documentation/v2.json"),
};

const vueVersions: string[] = Object.keys(DOCS);

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [vueVersion, setVueVersion] = useState<string | undefined>();
  const [isLoadingVueVersion, setIsLoadingVueVersion] = useState(true);

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  useEffect(() => {
    (() => {
      setQuery("");
      setSearchResults(undefined);
      setIsLoadingVueVersion(false);
    })();
  }, [vueVersion]);

  const onSearchTextChange = async (query: string) => {
    setSearchResults(await search(query));
  };

  const onVersionChange = (version: string) => {
    setVueVersion(version);
  };

  const algoliaClient = useMemo(() => {
    return algoliasearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const hierarchyToArray = (hierarchy: KeyValueHierarchy) => {
    return Object.values(hierarchy)
      .filter((hierarchyEntry: string | unknown) => hierarchyEntry)
      .map((hierarchyEntry: string) =>
        hierarchyEntry.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">")
      );
  };

  const getTitle = (hit: VueJsDocsHit): string => {
    return hierarchyToArray(hit.hierarchy).pop() || "";
  };

  const getSubTitle = (hit: VueJsDocsHit): string => {
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

    setQuery(query);
    setIsLoadingResults(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 11,
        facetFilters: [`version:${vueVersion}`],
      })
      .then((res) => {
        setIsLoadingResults(false);
        return mapHits(res.hits);
      })
      .catch((err) => {
        setIsLoadingResults(false);
        showToast(Toast.Style.Failure, "Error searching VueJS Documentation", err.message);
        return [];
      });
  };

  const mapHits = (hits: any[]): SectionHit[] => toSection(groupBy(hits, "hierarchy.lvl0"));
  const toSection = (hits: { [k: string]: VueJsDocsHit[] }) => Object.entries(hits).map(toMappedHit);

  const toMappedHit = ([section, items]: [string, VueJsDocsHit[]]): SectionHit => ({
    section,
    items,
  });

  if (!vueVersion) {
    return (
      <List
        isLoading={isLoadingVueVersion}
        searchBarAccessory={
          <VersionDropdown id={LSKeys.VueVersion} vueVersions={vueVersions} onVersionChange={onVersionChange} />
        }
      />
    );
  }

  return (
    <List
      throttle={true}
      enableFiltering={false}
      isLoading={isLoadingResults}
      searchText={query}
      onSearchTextChange={onSearchTextChange}
      searchBarAccessory={
        <VersionDropdown id={LSKeys.VueVersion} vueVersions={vueVersions} onVersionChange={onVersionChange} />
      }
    >
      {searchResults?.map((hit: SectionHit, k: number) => (
        <List.Section title={hit.section} key={k}>
          {hit.items.map((hit: VueJsDocsHit) => (
            <List.Item
              key={hit.objectID}
              title={getTitle(hit)}
              subtitle={getSubTitle(hit)}
              icon="vue-icon.png"
              actions={
                <ActionPanel title={hit.url}>
                  <Action.OpenInBrowser url={hit.url} title="Open in Browser" />
                  <Action.CopyToClipboard content={hit.url} title="Copy URL" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )) || <DocumentationList docs={DOCS[vueVersion]} />}
    </List>
  );
}
