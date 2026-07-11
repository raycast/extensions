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
import { DocList, SpatieDocsHit } from "./types";
import algoliaConfig from "./config/algolia";
import { getSubTitle, getTitle } from "./helpers";

const documentation: { [key: string]: DocList } = {
  v2: require("./documentation/browsershot/v2.json"),
};

export default function SearchDocumentation() {
  const getPreference = getPreferenceValues();
  const facetFilterVersion = "version:" + getPreference.spatieBrowsershotVersion;

  const algoliaClient = useMemo(() => {
    return algoliaSearch(algoliaConfig.app_id, algoliaConfig.api_key);
  }, [algoliaConfig.app_id, algoliaConfig.api_key]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(algoliaConfig.index);
  }, [algoliaClient, algoliaConfig.index]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const search = async (query = "") => {
    if (query === "") {
      return;
    }
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 11,
        facetFilters: [facetFilterVersion, "project:browsershot"],
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(ToastStyle.Failure, "Error searching Spatie Browsershot Documentation", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  const currentDocs = documentation[getPreference.spatieBrowsershotVersion];
  return (
    <List
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
    >
      {searchResults?.map((hit: SpatieDocsHit) => {
        return (
          <List.Item
            key={hit.objectID}
            title={getTitle(hit)}
            subtitle={getSubTitle(hit)}
            icon="spatie-icon.png"
            actions={
              <ActionPanel title={hit.url}>
                <OpenInBrowserAction url={hit.url} />
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
                    icon="spatie-icon.png"
                    actions={
                      <ActionPanel title={item.url}>
                        <OpenInBrowserAction url={item.url} />
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
