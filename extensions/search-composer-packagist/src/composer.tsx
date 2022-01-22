import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliaSearch from "algoliasearch/lite";

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
};

function getComposerRequireCommand(hit: PackagistHit) {
  return `composer require ${hit.name}`;
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
        facets: ["tags", "type", "type"],
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(ToastStyle.Failure, "Error searching Composer Packagist.", err.message);
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
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
    >
      {searchResults?.map((hit: PackagistHit) => {
        return (
          <List.Item
            key={hit.id}
            title={hit.name}
            subtitle={hit.description}
            icon="composer-icon.png"
            actions={
              <ActionPanel title={hit.name}>
                <CopyToClipboardAction
                  content={getComposerRequireCommand(hit)}
                  title={"Copy Composer Require Command"}
                />
                <OpenInBrowserAction url={hit.repository} title="Open Repository URL in Browser" />
                <OpenInBrowserAction url={getPackagistPageURL(hit)} title="Open Packagist Page in Browser" />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
