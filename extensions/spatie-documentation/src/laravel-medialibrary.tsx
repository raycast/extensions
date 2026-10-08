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
  v7: require("./documentation/laravel-medialibrary/v7.json"),
  v8: require("./documentation/laravel-medialibrary/v8.json"),
  v9: require("./documentation/laravel-medialibrary/v9.json"),
  v10: require("./documentation/laravel-medialibrary/v10.json"),
};

export default function SearchDocumentation() {
  const getPreference = getPreferenceValues();

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
        facetFilters: ["version:" + getPreference.spatieLaravelMedialibraryVersion, "project:laravel-medialibrary"],
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(ToastStyle.Failure, "Error searching Spatie Laravel Medialibrary Documentation", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  const currentDocs = documentation[getPreference.spatieLaravelMedialibraryVersion];
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
