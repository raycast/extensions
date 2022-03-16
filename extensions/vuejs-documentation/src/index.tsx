import { ActionPanel, List, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import striptags from "striptags";
import groupBy from "lodash.groupby";
import { DocumentationList } from "./documentation_list";
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
  v2: require("./documentation/v2.json"),
  v3: require("./documentation/v3.json"),
};

type Preferences = {
  vueVersion: string;
};

export default function Command() {
  const vueVersion = getPreferenceValues<Preferences>().vueVersion;
  const navigationTitle = `Search Documentation: (${vueVersion})`;
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
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 11,
        facetFilters: [`version:${vueVersion}`],
      })
      .then((res) => {
        setIsLoading(false);
        return mapHits(res.hits);
      })
      .catch((err) => {
        setIsLoading(false);
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

  const onSearchTextChange = async (query: string) => {
    setSearchResults(await search(query));
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  return (
    <List
      navigationTitle={navigationTitle}
      throttle={true}
      enableFiltering={false}
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
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
