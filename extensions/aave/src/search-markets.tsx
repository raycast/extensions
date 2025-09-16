import { ActionPanel, Action, Image, List, Color } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { getMarkets } from "./lib/api";
import { includeIncentivePrograms } from "./lib/preferences";

export default function () {
  const [selectedMarketId, setSelectedMarketId] = useCachedState<string>("AaveV3Ethereum");
  const { data: markets, isLoading: isLoadingMarkets } = useCachedPromise(getMarkets, [[]]);

  return (
    <List
      isLoading={isLoadingMarkets}
      searchBarPlaceholder="Search assets by symbol or address..."
      searchBarAccessory={
        <List.Dropdown
          isLoading={isLoadingMarkets}
          value={selectedMarketId ?? ""}
          tooltip="Select Market"
          placeholder="Search markets by name and address"
          onChange={(value) => setSelectedMarketId(value)}
        >
          {markets?.map((market) => (
            <List.Dropdown.Item
              key={market.id}
              icon={{
                source: market.icon,
                mask: Image.Mask.RoundedRectangle,
                fallback: market.chain.icon,
              }}
              title={market.name}
              value={market.id}
              keywords={[market.address]}
            />
          ))}
        </List.Dropdown>
      }
    >
      {markets
        ?.filter((market) => market.id === selectedMarketId)
        ?.map((market) => (
          <List.Section
            key={`${market.address}-${market.chain.id}-${market.name}`}
            title={`Market ${market.size}    Available ${market.liquidity}    Borrows ${market.borrows}`}
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
                      <Action.CopyToClipboard
                        title="Copy Underlying Token Name"
                        content={reserve.underlyingToken.name}
                      />
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
        title="No assets found"
        description="Search by symbol or address"
      />
    </List>
  );
}
