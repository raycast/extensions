import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useMemo, useState } from "react";
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

  const [searchResults, setSearchResults] = useState<PackagistHit[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const search = async (query = "") => {
    setIsLoading(true);
    if (query == "") {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await algoliaIndex.search<PackagistHit>(query, {
        hitsPerPage: 30,
        facets: ["tags", "type", "type"],
      });
      setSearchResults(res.hits);
      setIsLoading(false);
    } catch (err: any) {
      setSearchResults([]);
      await showToast(ToastStyle.Failure, "Error Searching Composer Packagist.", err.message);
      setIsLoading(false);
    }
  };
  return (
    <List throttle={true} isLoading={isLoading} onSearchTextChange={search}>
      {searchResults?.map((hit: PackagistHit) => {
        return (
          <List.Item
            key={hit.id}
            title={hit.name}
            subtitle={hit.description}
            icon="composer-icon.png"
            accessoryIcon={Icon.Star}
            accessoryTitle={hit.meta?.favers_formatted}
            actions={
              <ActionPanel title={hit.name}>
                <CopyToClipboardAction
                  content={getComposerRequireCommand(hit)}
                  title={"Copy Composer Require Command"}
                />
                <CopyToClipboardAction
                  content={getComposerRequireDevCommand(hit)}
                  title={"Copy Composer Require Dev Command"}
                />
                <CopyToClipboardAction content={hit.name} title={"Copy Package Name"} />
                <OpenInBrowserAction
                  url={hit.repository}
                  title="Open Repository URL in Browser"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                />
                <OpenInBrowserAction
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
