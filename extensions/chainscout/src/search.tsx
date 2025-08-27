import { ActionPanel, List, Action, Color, Icon, Toast, showToast, Keyboard } from "@raycast/api";
import React from "react";
import { ChainInfo } from "./types/api";
import upperFirst from "./utils/upperFirst";
import sortChains from "./utils/sortChains";
import filterChains from "./utils/filterChains";
import ItemDetails from "./components/ItemDetails";
import formatEcosystems from "./utils/formatEcosystems";
import EcosystemDropdown from "./components/EcosystemDropdown";

const MAX_CHAIN_ITEMS = 20;

export default function Command() {
  const [searchText, setSearchText] = React.useState("");
  const [chains, setChains] = React.useState<Array<ChainInfo>>([]);
  const [activeEcosystem, setActiveEcosystem] = React.useState<string>("All");
  const [ecosystems, setEcosystems] = React.useState<Array<string>>([]);

  const fetchChains = React.useCallback(async () => {
    try {
      const chainResponse = await fetch("https://chains.blockscout.com/api/chains");
      const featuredChainsResponse = await fetch("https://chains.blockscout.com/api/featured");
      const chainsData = (await chainResponse.json()) as Record<string, ChainInfo>;
      const featuredChainsData = (await featuredChainsResponse.json()) as Array<string>;

      const formattedChainsData = Object.entries(chainsData)
        .map(([chainId, chainInfo]) => ({
          ...chainInfo,
          chainId: chainId,
          featured: featuredChainsData.includes(chainId),
        }))
        .sort(sortChains(featuredChainsData));

      const ecosystems = formattedChainsData
        .map((chain) => chain.ecosystem)
        .filter(Boolean)
        .flat();
      const uniqueEcosystems = [...new Set(ecosystems)];

      setChains(formattedChainsData);
      setEcosystems(["All", ...uniqueEcosystems]);
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading chains",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  React.useEffect(() => {
    fetchChains();
  }, []);

  const filteredChains = React.useMemo(() => {
    return chains.filter(filterChains(searchText, activeEcosystem));
  }, [chains, searchText, activeEcosystem]);

  const onEcosystemChange = React.useCallback((ecosystem: string) => {
    setActiveEcosystem(ecosystem);
  }, []);

  return (
    <List
      isLoading={chains.length === 0}
      searchBarPlaceholder={`Search chains (top ${MAX_CHAIN_ITEMS} are shown)...`}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        ecosystems.length > 1 ? (
          <EcosystemDropdown ecosystems={ecosystems} onEcosystemChange={onEcosystemChange} />
        ) : undefined
      }
    >
      {filteredChains.slice(0, MAX_CHAIN_ITEMS).map((chain) => {
        const chainEcosystems = formatEcosystems(chain.ecosystem);

        return (
          <List.Item
            key={chain.chainId}
            id={chain.chainId}
            icon={chain.logo}
            title={chain.name}
            accessories={[
              chain.layer
                ? {
                    tag: {
                      value: `L${chain.layer}`,
                      color: Color.Yellow,
                    },
                  }
                : undefined,
              chain.isTestnet
                ? {
                    tag: {
                      value: "Testnet",
                      color: Color.Red,
                    },
                  }
                : undefined,
              chain.rollupType
                ? {
                    text: upperFirst(chain.rollupType) + " Rollup",
                  }
                : undefined,
              ...(chainEcosystems.length > 0
                ? chainEcosystems.map((ecosystem) => ({ text: upperFirst(ecosystem) }))
                : []),
            ].filter(Boolean)}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<ItemDetails data={chain} />} />
                {chain.explorers.map((explorer, index) => (
                  <Action.OpenInBrowser
                    key={explorer.url}
                    title={`Open Explorer${chain.explorers.length > 1 ? ` ${index + 1}` : ""}`}
                    url={explorer.url}
                    icon={Icon.MagnifyingGlass}
                  />
                ))}
                {chain.website && (
                  <Action.OpenInBrowser
                    title="Open Project Website"
                    url={chain.website}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Chain ID"
                  content={chain.chainId}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
