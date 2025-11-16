import { ChainList } from "@bgd-labs/toolbox";
import { ActionPanel, Action, List, Color, Image } from "@raycast/api";
import uFuzzy from "@leeoniya/ufuzzy";
import { useMemo, useState } from "react";
import { useCachedPromise, useFetch } from "@raycast/utils";
import { getChains } from "./lib/api";
import { formatMarketName, formatSmartContractName } from "./lib/format";

type SmartContractItem = {
  path: string[];
  value: string;
  chainId: number;
  link: string;
  searchPath: string;
};

function getSearchTags(key: string): string[] {
  const tags: Record<string, string[]> = {
    S_TOKEN: ["stable", "debt"],
    V_TOKEN: ["variable", "debt"],
    STATA_TOKEN: ["stata", "static"],
  };

  return tags[key] || [];
}

function getVersionPriority(name: string): number {
  const priorities: Record<string, number> = {
    AaveV3: 1,
    AaveV2: 2,
    AaveV1: 3,
  };

  for (const version in priorities) {
    if (name.startsWith(version)) {
      return priorities[version];
    }
  }
  return 4;
}

function compareSmartContracts(a: SmartContractItem, b: SmartContractItem) {
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

  const { data: chains, isLoading: isLoadingChains } = useCachedPromise(getChains, []);

  const { isLoading: isLoadingAddresses, data: addresses } = useFetch<string, undefined, SmartContractItem[]>(
    "https://raw.githubusercontent.com/bgd-labs/aave-address-book/main/safe.csv",
    {
      mapResult: (text) => {
        const data = text
          .split("\n")
          .filter(Boolean)
          .slice(1)
          .map((line: string) => {
            const [address, fullPath, chainId] = line.split(",");
            const parsedChainId = parseInt(chainId, 10);
            const path = fullPath.trim().split(" ");

            return {
              value: address,
              path,
              chainId: parsedChainId,
              link: `${ChainList[parsedChainId as keyof typeof ChainList]?.blockExplorers?.default.url.replace(/\/$/, "")}/address/${address}`,
              searchPath: [...path, address, ...getSearchTags(path[path.length - 1])].join(" "),
            };
          });

        return { data };
      },
    },
  );

  const uf = useMemo(() => {
    const opts = {
      intraMode: 1,
      intraChars: "[a-z\\d'_]",
    };
    return new uFuzzy(opts);
  }, []);

  const filteredAddresses = useMemo(() => {
    if (!searchText || !addresses) {
      return [];
    }

    const searchPaths = addresses.map((addr) => addr.searchPath.replace(/_/g, ""));
    const [matches, , order] = uf.search(searchPaths, searchText, 10);

    if (!order || !matches) {
      return [];
    }

    return order.map((r) => addresses[matches[r]]).sort(compareSmartContracts);
  }, [searchText, uf, addresses]);

  return (
    <List
      onSearchTextChange={setSearchText}
      filtering={false}
      isLoading={isLoadingChains || isLoadingAddresses}
      searchBarPlaceholder="Search contracts by name, version, or type"
    >
      {filteredAddresses?.map((item) => {
        const icon = chains?.find((chain) => chain.id === item.chainId)?.icon;
        const marketName = item.path[0] ? formatMarketName(item.path[0]) : "";

        return (
          <List.Item
            key={item.path.join("")}
            icon={
              icon
                ? {
                    source: icon,
                    mask: Image.Mask.RoundedRectangle,
                  }
                : undefined
            }
            title={{ tooltip: item.value, value: formatSmartContractName(item.path[item.path.length - 1]) }}
            subtitle={item.path.length > 2 ? item.path.slice(1, -1).join(" → ") : undefined}
            keywords={item.path}
            accessories={[{ text: marketName }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Explorer" url={item.link} />
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Address" content={item.value} />
                  <Action.CopyToClipboard title="Copy Explorer URL" content={item.link} />
                  <Action.CopyToClipboard title="Copy Name" content={item.path[item.path.length - 1]} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        icon={{
          tintColor: Color.SecondaryText,
          source: "logomark.svg",
        }}
        title="No assets found"
        description="Search contracts by name, version, or type"
      />
    </List>
  );
}
