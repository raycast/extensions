import { ActionPanel, Icon, List, Action, Color } from "@raycast/api";
import { useMemo, useState } from "react";
import algoliaSearch from "algoliasearch/lite";
import { useCachedPromise } from "@raycast/utils";

const APPID = "M58222SH95";
const APIKEY = "5ae4d03c98685bd7364c2e0fd819af05";
const INDEX = "packagist";

type PackagistHitMeta = {
  downloads: number;
  downloads_formatted: string;
  favers: number;
  favers_formatted: string;
};

type PackagistHit = {
  id: number;
  name: string;
  package_organisation: string;
  package_name: string;
  description: string;
  type: string;
  repository: string;
  language: string;
  trendiness: number;
  popularity: number;
  meta: PackagistHitMeta;
  tags: string[];
  abandoned: boolean;
};

function getComposerRequireCommand(hit: PackagistHit) {
  return `composer require ${hit.name}`;
}

function getComposerRequireDevCommand(hit: PackagistHit) {
  return `composer require --dev ${hit.name}`;
}

function getPackagistPageURL(hit: PackagistHit) {
  return `https://packagist.org/packages/${hit.name}`;
}

export default function SearchDocumentation() {
  const algoliaClient = useMemo(() => {
    return algoliaSearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchText, setSearchText] = useState("");

  const {
    isLoading,
    data: searchResults,
    pagination,
  } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      if (!query)
        return {
          data: [],
          hasMore: false,
        };
      const res = await algoliaIndex.search<PackagistHit>(query, {
        hitsPerPage: 30,
        page: options.page,
        facets: ["tags", "type", "type"],
      });
      return { data: res.hits, hasMore: res.page < res.nbPages };
    },
    [searchText],
    {
      failureToastOptions: {
        title: "Error Searching Composer Packagist.",
      },
      initialData: [],
    },
  );

  return (
    <List
      searchBarPlaceholder="Search packages"
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      pagination={pagination}
    >
      {searchResults.map((hit: PackagistHit) => {
        return (
          <List.Item
            key={hit.id}
            title={hit.name}
            accessories={[
              ...(hit.abandoned
                ? [
                    {
                      icon: {
                        source: Icon.Warning,
                        tintColor: Color.Yellow,
                      },
                      tooltip: "Abandoned",
                    },
                  ]
                : []),
              {
                icon: Icon.Star,
                text: hit.meta?.favers_formatted,
                tooltip: hit.meta?.favers_formatted,
              },
            ]}
            subtitle={hit.description}
            icon="composer-icon.png"
            actions={
              <ActionPanel title={hit.name}>
                <Action.CopyToClipboard
                  content={getComposerRequireCommand(hit)}
                  title={"Copy Composer Require Command"}
                />
                <Action.CopyToClipboard
                  content={getComposerRequireDevCommand(hit)}
                  title={"Copy Composer Require Dev Command"}
                />
                <Action.CopyToClipboard content={hit.name} title={"Copy Package Name"} />
                <Action.OpenInBrowser
                  url={hit.repository}
                  title="Open Repository URL in Browser"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                />
                <Action.OpenInBrowser
                  url={getPackagistPageURL(hit)}
                  title="Open Packagist Page in Browser"
                  shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "return" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
