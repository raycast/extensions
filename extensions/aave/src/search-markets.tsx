import { ActionPanel, Action, Image, List, Color } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getChains, getMarkets } from "./lib/api";
import { chainId, ChainId } from "@aave/client";

export default function SearchMarkets() {
  const [selectedChainId, setSelectedChainId] = useCachedState<ChainId>("chainId", chainId(1));
  const { data: chains, isLoading: isLoadingChains } = useCachedPromise(getChains);
  const { data: markets, isLoading: isLoadingMarkets } = useCachedPromise(getMarkets, [[selectedChainId]]);

  return (
    <List
      isLoading={isLoadingMarkets}
      searchBarPlaceholder="Search markets by symbol or address..."
      searchBarAccessory={
        <List.Dropdown
          isLoading={isLoadingChains}
          value={selectedChainId.toString()}
          tooltip="Select Chain"
          onChange={(value) => setSelectedChainId(chainId(Number(value)))}
        >
          {chains?.map((chain) => (
            <List.Dropdown.Item
              key={chain.chainId}
              icon={{
                source: chain.icon,
                mask: Image.Mask.RoundedRectangle,
              }}
              title={chain.name}
              value={chain.chainId.toString()}
            />
          ))}
        </List.Dropdown>
      }
    >
      {markets?.map((market) => (
        <List.Section key={market.address} title={market.name}>
          {market.reserves.map((reserve) => (
            <List.Item
              key={reserve.underlyingToken.address}
              icon={{
                source: reserve.underlyingToken.icon,
                mask: Image.Mask.RoundedRectangle,
              }}
              title={reserve.underlyingToken.name}
              subtitle={reserve.underlyingToken.symbol}
              keywords={[reserve.underlyingToken.address]}
              accessories={[
                { text: reserve.size, tooltip: "Total Supplied" },
                { tag: { value: reserve.supplyApy, color: Color.Green }, tooltip: "Supply APY" },
                { tag: { value: reserve.borrowApy, color: Color.Red }, tooltip: "Borrow APY" },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Install Command"
                      content={`npm install "`}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
