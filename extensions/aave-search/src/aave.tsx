import { useAddresses, ListItem } from "./utils/useAddresses";
import { ChainList } from "@bgd-labs/toolbox";
import { ActionPanel, Action, List, Color } from "@raycast/api";
import uFuzzy from "@leeoniya/ufuzzy";
import { useMemo, useState } from "react";
import { getChainIcon } from "./utils/getChainIcon";
import { Icon } from "@raycast/api";

const SEARCH_LIMIT = 100;

const VERSION_PRIORITY: { [key: string]: number } = {
  AaveV3: 1,
  AaveV2: 2,
  AaveV1: 3,
};

function getVersionPriority(name: string): number {
  for (const version in VERSION_PRIORITY) {
    if (name.startsWith(version)) {
      return VERSION_PRIORITY[version];
    }
  }
  return 4;
}

function createComparator(searchQuery: string, marketNames: Set<string>) {
  return function comp(a: ListItem, b: ListItem) {
    const queryLower = searchQuery.toLowerCase();
    const aPathLower = a.searchPath.toLowerCase();
    const bPathLower = b.searchPath.toLowerCase();

    const aExactStart = aPathLower.startsWith(queryLower);
    const bExactStart = bPathLower.startsWith(queryLower);

    if (aExactStart && !bExactStart) return -1;
    if (!aExactStart && bExactStart) return 1;

    const aVersionPriority = getVersionPriority(a.searchPath);
    const bVersionPriority = getVersionPriority(b.searchPath);

    if (aVersionPriority !== bVersionPriority) {
      return aVersionPriority - bVersionPriority;
    }

    const isMarketQuery = marketNames.has(queryLower);

    if (!isMarketQuery) {
      const aIsEthereum = a.chainId === 1;
      const bIsEthereum = b.chainId === 1;

      if (aIsEthereum && !bIsEthereum) return -1;
      if (!aIsEthereum && bIsEthereum) return 1;
    }

    const aInProduction = !ChainList[a.chainId as keyof typeof ChainList]?.testnet;
    const bInProduction = !ChainList[b.chainId as keyof typeof ChainList]?.testnet;

    if (aInProduction && !bInProduction) return -1;
    if (!aInProduction && bInProduction) return 1;

    if (a.path.length !== b.path.length) {
      return a.path.length - b.path.length;
    }

    return a.searchPath.localeCompare(b.searchPath);
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data: addresses, error } = useAddresses();

  const { uf, cleanedSearchPaths } = useMemo(() => {
    if (!addresses) return { uf: null, cleanedSearchPaths: [] };

    const opts = {
      intraMode: 1,
      intraChars: "[a-z\\d'_]",
    };
    const cleaned = addresses.map((addr) => addr.searchPath.replace(/_/g, ""));
    return {
      uf: new uFuzzy(opts),
      cleanedSearchPaths: cleaned,
    };
  }, [addresses]);

  const filteredAddresses = useMemo(() => {
    if (!searchText.trim() || !addresses || !uf) return [];

    const [matches, , order] = uf.search(cleanedSearchPaths, searchText, 10);
    let results: ListItem[] = [];

    if (matches) {
      if (order) {
        results = order.slice(0, SEARCH_LIMIT).map((r) => addresses[matches[r]]);
      } else {
        results = matches.map((r) => addresses[r]);
      }
    }

    const extractChainName = (searchPath: string): string | null => {
      const match = searchPath.match(/^AaveV[1-4]([A-Za-z]+)/);
      return match ? match[1].toLowerCase() : null;
    };

    const allChainNames = new Set(
      addresses.map((addr) => extractChainName(addr.searchPath)).filter((name): name is string => name !== null),
    );

    const sortedResults = results.sort(createComparator(searchText, allChainNames)).slice(0, SEARCH_LIMIT);

    return sortedResults;
  }, [searchText, uf, addresses, cleanedSearchPaths]);

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={`Failed to load Aave contracts`} />
      </List>
    );
  }

  return (
    <List onSearchTextChange={setSearchText} filtering={false} isLoading={isLoading}>
      {filteredAddresses.length === 0 && !searchText ? (
        <List.EmptyView
          icon={{
            source: {
              light: "logomark-dark.svg",
              dark: "logomark-light.svg",
            },
          }}
          title="Start Searching"
          description="Search for Aave contracts by name, version, or type"
        />
      ) : (
        filteredAddresses.map((item) => {
          return (
            <List.Item
              key={item.path.join("")}
              icon={{ source: `chains/${getChainIcon(item.chainId)}`, tintColor: Color.SecondaryText }}
              title={{ tooltip: item.value, value: item.path[item.path.length - 1] }}
              subtitle={item.path.length > 2 ? item.path.slice(1, -1).join(" → ") : undefined}
              keywords={item.path}
              accessories={[{ text: item.path[0] }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.link} />
                  <Action.CopyToClipboard content={item.value} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
