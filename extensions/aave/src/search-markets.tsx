import { ActionPanel, Action, Image, List, Color } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getChains, getMarkets } from "./lib/api";
import { chainId, ChainId } from "@aave/client";
import { includeIncentivePrograms } from "./lib/preferences";

export default function () {
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
          placeholder="Search chains by name"
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
              keywords={[chain.chainId.toString()]}
            />
          ))}
        </List.Dropdown>
      }
    >
      {markets?.map((market) => (
        <List.Section
          key={market.address}
          title={market.name}
          subtitle={`Market $${market.size}    Liquidity $${market.liquidity}    Borrows $${market.borrows}`}
        >
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
                { text: reserve.totalSupply, tooltip: "Total Supplied" },
                {
                  tag: {
                    value: includeIncentivePrograms ? reserve.totalSupplyApy : reserve.protocolSupplyApy,
                    color: Color.Green,
                  },
                  tooltip: "Supply APY",
                },
                { text: reserve.totalBorrow, tooltip: "Total Borrowed" },
                {
                  tag: {
                    value: includeIncentivePrograms ? reserve.totalBorrowApy : reserve.protocolBorrowApy,
                    color: Color.Red,
                  },
                  tooltip: "Borrow APY",
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Open in Aave" url={reserve.url} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Market Address" content={market.address} />
                    <Action.CopyToClipboard title="Copy Underlying Token Name" content={reserve.underlyingToken.name} />
                    <Action.CopyToClipboard
                      title="Copy Underlying Token Symbol"
                      content={reserve.underlyingToken.symbol}
                    />
                    <Action.CopyToClipboard
                      title="Copy Underlying Token Address"
                      content={reserve.underlyingToken.address}
                    />
                    <Action.CopyToClipboard
                      title="Copy Interest Bearing Token Address"
                      content={reserve.interestBearingToken.address}
                    />
                    <Action.CopyToClipboard
                      title="Copy Interest Bearing Token Name"
                      content={reserve.interestBearingToken.name}
                    />
                    <Action.CopyToClipboard
                      title="Copy Interest Bearing Token Symbol"
                      content={reserve.interestBearingToken.symbol}
                    />
                    <Action.CopyToClipboard
                      title="Copy Variable Debt Token Address"
                      content={reserve.variableDebtToken.address}
                    />
                    <Action.CopyToClipboard
                      title="Copy Variable Debt Token Name"
                      content={reserve.variableDebtToken.name}
                    />
                    <Action.CopyToClipboard
                      title="Copy Variable Debt Token Symbol"
                      content={reserve.variableDebtToken.symbol}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        icon={{
          tintColor: Color.SecondaryText,
          source: "logomark.svg",
        }}
        title="No markets found"
        description="Search for Aave markets by symbol or address"
      />
    </List>
  );
}
