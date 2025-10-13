import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { FC } from "react";
import { Token } from "../types/tokens";
import { resolveUrl, SolType } from "../utils/explorerResolver";
import { nFormatter } from "../utils/nFormatter";

interface ITokenDetailViewProps {
  token: Token;
  cluster: string;
}

export const TokenDetailView: FC<ITokenDetailViewProps> = ({ token, cluster }) => {
  const {
    data: tokenCoingeckoData,
    revalidate: revalidateTokenCoingeckoData,
    isLoading: isTokenCoingeckoDataLoading,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useFetch<any>(`https://api.coingecko.com/api/v3/coins/${token.extensions?.coingeckoId}`, {
    execute: !!token.extensions?.coingeckoId,
  });

  const markdown = `
# ${token.name}

![](${token.logoURI})
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isTokenCoingeckoDataLoading}
      actions={
        <ActionPanel>
          <Action
            title="Reload"
            onAction={() => {
              revalidateTokenCoingeckoData();
            }}
          />
          <Action.CopyToClipboard title="Copy Address" content={token.address} />
          <Action.OpenInBrowser
            title="Open in Explorer"
            url={resolveUrl(token.address, SolType.TOKEN, cluster)}
            icon={getFavicon(resolveUrl(token.address, SolType.ADDRESS, cluster))}
            shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={token.name} />
          <List.Item.Detail.Metadata.Label title="Symbol" text={token.symbol} />
          <List.Item.Detail.Metadata.Label title="Address" text={token.address} />
          <List.Item.Detail.Metadata.Label title="Decimals" text={token.decimals.toString()} />
          {tokenCoingeckoData?.market_data?.current_price?.usd && (
            <List.Item.Detail.Metadata.Label
              title="Price"
              text={`$${tokenCoingeckoData.market_data.current_price.usd}`}
            />
          )}

          {tokenCoingeckoData?.market_data?.price_change_24h_in_currency?.usd && (
            <List.Item.Detail.Metadata.Label
              title="Price change (24 hour)"
              text={`$${tokenCoingeckoData.market_data.price_change_24h_in_currency.usd}`}
              icon={{
                source:
                  tokenCoingeckoData.market_data.price_change_24h_in_currency.usd === 0
                    ? Icon.CircleFilled
                    : tokenCoingeckoData.market_data.price_change_24h_in_currency.usd > 0
                      ? Icon.ArrowUpCircleFilled
                      : Icon.ArrowDownCircleFilled,
                tintColor:
                  tokenCoingeckoData.market_data.price_change_24h_in_currency.usd === 0
                    ? Color.Blue
                    : tokenCoingeckoData.market_data.price_change_24h_in_currency.usd > 0
                      ? Color.Green
                      : Color.Red,
              }}
            />
          )}

          {tokenCoingeckoData?.market_data?.market_cap?.usd && (
            <List.Item.Detail.Metadata.Label
              title="Market Cap"
              text={`$${nFormatter(tokenCoingeckoData.market_data.market_cap.usd)}`}
            />
          )}

          {tokenCoingeckoData?.market_data?.total_volume?.usd && (
            <List.Item.Detail.Metadata.Label
              title="Total Volume (24 hour)"
              text={`$${nFormatter(tokenCoingeckoData.market_data.total_volume.usd)}`}
            />
          )}
        </Detail.Metadata>
      }
    />
  );
};
