import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

interface Chain {
  name: string;
  chain: string;
  icon?: string;
  rpc: string[];
  features?: { name: string }[];
  faucets: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  infoURL: string;
  shortName: string;
  chainId: number;
  networkId: number;
  slip44?: number;
  ens?: { registry: string };
  explorers?: {
    name: string;
    url: string;
    standard: string;
  }[];
  tvl?: number;
}

interface ChainTVL {
  gecko_id: string;
  tokenSymbol: string;
  cmcId: string;
  tvl: number;
  tvlPrevDay: number;
  tvlPrevWeek: number;
  tvlPrevMonth: number;
  chainId: number;
}

function populateChain(chain: Chain, chainTvls: ChainTVL[]): Chain {
  const tvlData = chainTvls.find((c) => c.chainId === chain.chainId);
  return {
    ...chain,
    tvl: tvlData?.tvl || 0,
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [chains, setChains] = useState<Chain[]>([]);
  const [filteredChains, setFilteredChains] = useState<Chain[]>([]);

  const { data: chainsData, isLoading: isLoadingChains } = useFetch<Chain[]>("https://chainid.network/chains.json");
  const { data: chainTvls, isLoading: isLoadingTvls } = useFetch<ChainTVL[]>("https://api.llama.fi/chains");

  useEffect(() => {
    if (chainsData && chainTvls) {
      const sortedChains = chainsData
        .filter((c) => c.name !== "420coin") // same chainId as ronin
        .map((chain) => populateChain(chain, chainTvls))
        .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0));

      setChains(sortedChains);
      setFilteredChains(sortedChains);
    }
  }, [chainsData, chainTvls]);

  useEffect(() => {
    const filtered = chains.filter(
      (chain) =>
        chain.name.toLowerCase().includes(searchText.toLowerCase()) ||
        chain.chainId.toString().includes(searchText) ||
        chain.shortName.toLowerCase().includes(searchText.toLowerCase()),
    );
    setFilteredChains(filtered);
  }, [searchText, chains]);

  return (
    <List
      isLoading={isLoadingChains || isLoadingTvls}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search chains by name, ID, or short name..."
      throttle
    >
      <List.Section title="Results" subtitle={filteredChains.length + ""}>
        {filteredChains.map((chain) => (
          <ChainListItem key={chain.chainId} chain={chain} />
        ))}
      </List.Section>
    </List>
  );
}

function ChainListItem({ chain }: { chain: Chain }) {
  return (
    <List.Item
      title={chain.name}
      subtitle={`Chain ID: ${chain.chainId}`}
      accessories={[
        { text: chain.shortName, icon: Icon.Tag },
        { text: `TVL: $${chain.tvl?.toLocaleString() || "N/A"}`, icon: Icon.Coins },
        { text: `${chain.rpc.length} RPCs`, icon: Icon.Globe },
        ...(chain.explorers && chain.explorers.length > 0 ? [{ text: "Explorers", icon: Icon.Link }] : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="View Details" target={<ChainDetails chain={chain} />} icon={Icon.Eye} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Chain ID"
              content={chain.chainId.toString()}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Chain Name"
              content={chain.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ChainDetails({ chain }: { chain: Chain }) {
  return (
    <List>
      <List.Item
        title="Chain Name"
        subtitle={chain.name}
        icon={Icon.Text}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={chain.name} title="Copy Chain Name" />
          </ActionPanel>
        }
      />
      <List.Item
        title="Chain ID"
        subtitle={chain.chainId.toString()}
        icon={Icon.Tag}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={chain.chainId.toString()} title="Copy Chain ID" />
          </ActionPanel>
        }
      />
      <List.Item
        title="TVL (Total Value Locked)"
        subtitle={`$${chain.tvl?.toLocaleString() || "N/A"}`}
        icon={Icon.Coins}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={`$${chain.tvl?.toLocaleString() || "N/A"}`} title="Copy TVL" />
          </ActionPanel>
        }
      />
      <List.Item
        title="Native Currency"
        subtitle={chain.nativeCurrency.symbol}
        icon={Icon.Coin}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={chain.nativeCurrency.symbol} title="Copy Native Currency" />
          </ActionPanel>
        }
      />
      <List.Item
        title="Info URL"
        subtitle={chain.infoURL}
        icon={Icon.Link}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={chain.infoURL} />
            <Action.CopyToClipboard content={chain.infoURL} title="Copy Info URL" />
          </ActionPanel>
        }
      />
      {chain.explorers && (
        <List.Section title="Explorers">
          {chain.explorers.map((explorer, index) => (
            <List.Item
              key={index}
              title={explorer.name}
              subtitle={explorer.url}
              icon={Icon.Link}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={explorer.url} />
                  <Action.CopyToClipboard content={explorer.url} title={`Copy ${explorer.name} URL`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="RPCs" subtitle={`${chain.rpc.length} available`}>
        {chain.rpc.map((rpc, index) => (
          <List.Item
            key={index}
            title={`RPC ${index + 1}`}
            subtitle={rpc}
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy RPC URL"
                  content={rpc}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenInBrowser title="Open in Browser" url={rpc} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {chain.features && chain.features.length > 0 && (
        <List.Section title="Features">
          {chain.features.map((feature, index) => (
            <List.Item
              key={index}
              title={feature.name}
              icon={Icon.Star}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={feature.name} title={`Copy Feature: ${feature.name}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
