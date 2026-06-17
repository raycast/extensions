import {
  getPreferenceValues,
  ActionPanel,
  List,
  CopyToClipboardAction,
  OpenInBrowserAction,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch";
import striptags from "striptags";

const APPID = "BH4D9OD16A";
const APIKEY = "5aa44fede3f10262000a8c4f046033d5";
const INDEX = "laravel_nova";

interface Preferences {
  novaVersion: string;
  hitLimit: number;
}

type docList = {
  [key: string]: {
    url: string;
    title: string;
  }[];
};

const DOCS: { [key: string]: docList } = {
  "4.0.0": require("./documentation/4.0.json"),
  "3.0.0": require("./documentation/3.0.json"),
  "2.0.0": require("./documentation/2.0.json"),
  "1.0.0": require("./documentation/1.0.json"),
};

type KeyValueHierarchy = {
  [key: string]: string;
};

type NovaDocHit = {
  url: string;
  hierarchy: KeyValueHierarchy;
  objectID: string;
  content: string;
  anchor: string;
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

export default function SearchNova() {
  const preferences: Preferences = getPreferenceValues();

  const icon = { source: { light: "icon-dark.png", dark: "icon-light.png" } };

  const algoliaClient = useMemo(() => {
    return algoliasearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const hierarchyToArray = (hierarchy: KeyValueHierarchy) => {
    return Object.values(hierarchy)
      .filter((hierarchyEntry: string | unknown) => hierarchyEntry)
      .map((hierarchyEntry: string) => hierarchyEntry.replaceAll("&amp;", "&").replaceAll("&#x27;", "'"));
  };

  const getTitle = (hit: NovaDocHit): string => {
    return hierarchyToArray(hit.hierarchy).pop() || "";
  };

  const getSubTitle = (hit: NovaDocHit): string => {
    const highlightResult = striptags(hit._highlightResult?.content?.value || "");
    if (highlightResult) {
      return highlightResult;
    }

    const hierarchy = hierarchyToArray(hit.hierarchy) || [];
    hierarchy.pop();
    return hierarchy.join(" > ");
  };

  const [novaVersion, setNovaVersion] = useState(preferences.novaVersion);

  const updateVersion = async (value: string) => {
    setNovaVersion(value);
    setSearchResults(await search());
  };

  const versionDropdown = (
    <List.Dropdown tooltip="Select Your Nova Version" defaultValue={novaVersion} onChange={updateVersion}>
      {Object.keys(DOCS).map((version) => {
        return <List.Dropdown.Item value={version} title={version} key={version} />;
      })}
    </List.Dropdown>
  );

  const search = async (query = searchQuery) => {
    if (query !== searchQuery) {
      setSearchQuery(query);
    }
    if (query === "") {
      return;
    }
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: preferences.hitLimit,
        facetFilters: ["version:" + novaVersion],
      })
      .then((res) => {
        setIsLoading(false);
        //console.log(res);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Error searching Laravel Nova Documentation", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      searchBarPlaceholder={"Search Nova Docs"}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
      searchBarAccessory={versionDropdown}
    >
      {searchResults?.map((hit: NovaDocHit) => {
        return (
          <List.Item
            key={hit.objectID}
            title={getTitle(hit)}
            subtitle={getSubTitle(hit)}
            icon={icon}
            // accessoryTitle={`🏷️ ${hit.taxonomy} | ⏳ ${convertTime(hit.length)}`}
            actions={
              <ActionPanel title={hit.url}>
                <OpenInBrowserAction url={hit.url} title="Open in Browser" />
                <CopyToClipboardAction content={hit.url} title="Copy URL" />
              </ActionPanel>
            }
          />
        );
      }) ||
        Object.entries(DOCS[novaVersion]).map(([section, items]: Array<any>) => {
          return (
            <List.Section title={section} key={section}>
              {items.map((item: any) => {
                return (
                  <List.Item
                    key={item.url}
                    title={item.title}
                    icon={icon}
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
