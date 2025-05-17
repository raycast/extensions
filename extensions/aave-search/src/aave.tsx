import { useAddresses, ListItem } from "./utils/useAddresses";
import { ChainList } from "@bgd-labs/rpc-env";
import { ActionPanel, Action, List, Color } from "@raycast/api";
import uFuzzy from "@leeoniya/ufuzzy";
import { useMemo, useState } from "react";
import { getChainIcon } from "./utils/getChainIcon";
import { Icon } from "@raycast/api";

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

function comp(a: ListItem, b: ListItem) {
  const aChain = ChainList[a.chainId as keyof typeof ChainList];
  const bChain = ChainList[b.chainId as keyof typeof ChainList];

  if (!aChain || !bChain) {
    return 0;
  }

  const aInProduction = !aChain.testnet;
  const bInProduction = !bChain.testnet;

  if (aInProduction && !bInProduction) {
    return -1;
  } else if (!aInProduction && bInProduction) {
    return 1;
  }

  const aVersionPriority = getVersionPriority(a.searchPath);
  const bVersionPriority = getVersionPriority(b.searchPath);

  if (aVersionPriority !== bVersionPriority) {
    return aVersionPriority - bVersionPriority;
  }
  return 0;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data: addresses, error } = useAddresses();

  const uf = useMemo(() => {
    const opts = {
      intraMode: 1,
      intraChars: "[a-z\\d'_]",
    };
    return new uFuzzy(opts);
  }, []);

  const filteredAddresses = useMemo(() => {
    if (!searchText || !addresses) return [];

    const searchPaths = addresses.map((addr) => addr.searchPath.replace(/_/g, ""));
    const [matches, , order] = uf.search(searchPaths, searchText, 10);

    if (!order || !matches) return [];

    return order.map((r) => addresses[matches[r]]).sort(comp);
  }, [searchText, uf, addresses]);

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
