import { usePromise } from "@raycast/utils";
import { TickerToken, Token } from "../types";
import axios from "axios";
import { ReactNode, useRef } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { nFormatter } from "../utils";

interface ITokenDetailListItemProps {
  tokenTicker: TickerToken;
  extraActions?: ReactNode;
}

const TokenDetailListItem = ({ tokenTicker, extraActions }: ITokenDetailListItemProps) => {
  const abortable = useRef<AbortController>();

  const { data: token } = usePromise(
    async (id: string) => {
      const { data } = await axios.get(`https://api.mochi.pod.town/api/v1/defi/coins/${id}`);
      return data.data as Token;
    },
    [tokenTicker.id as string],
    { abortable, execute: !!tokenTicker.id }
  );

  return (
    <List.Item
      key={tokenTicker.id}
      title={tokenTicker.name}
      subtitle={tokenTicker.symbol.toUpperCase()}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Token Name" content={tokenTicker.name} />
          <Action.CopyToClipboard title="Copy Token Symbol" content={tokenTicker.symbol.toUpperCase()} />
          <Action.OpenInBrowser
            title="Open in CoinGecko"
            url={`https://www.coingecko.com/en/coins/${tokenTicker.id}`}
          />
          {extraActions}
        </ActionPanel>
      }
      detail={
        token && (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Icon" icon={token.image.thumb} />
                <List.Item.Detail.Metadata.Label title="Name" text={token.name} />
                <List.Item.Detail.Metadata.Label title="Symbol" text={token.symbol.toUpperCase()} />
                {token.description.en && (
                  <List.Item.Detail.Metadata.Label title="Description" text={token.description.en} />
                )}
                <List.Item.Detail.Metadata.Separator />
                {token.market_cap_rank && (
                  <List.Item.Detail.Metadata.Label title="Market Cap Rank" text={`$${token.market_cap_rank}`} />
                )}
                {token.market_data.current_price.usd && (
                  <List.Item.Detail.Metadata.Label
                    title="Current Price (USD)"
                    text={`$${token.market_data.current_price.usd}`}
                  />
                )}
                {token.market_data.market_cap.usd && (
                  <List.Item.Detail.Metadata.Label
                    title="Market Cap (USD)"
                    text={`$${nFormatter(token.market_data.market_cap.usd)}`}
                  />
                )}
                {token.market_data.price_change_percentage_1h_in_currency.usd && (
                  <List.Item.Detail.Metadata.Label
                    title="Price Change (1h)"
                    text={`$${token.market_data.price_change_percentage_1h_in_currency.usd}`}
                    icon={{
                      source:
                        token.market_data.price_change_percentage_1h_in_currency.usd === 0
                          ? Icon.CircleFilled
                          : token.market_data.price_change_percentage_1h_in_currency.usd > 0
                          ? Icon.ArrowUpCircleFilled
                          : Icon.ArrowDownCircleFilled,
                      tintColor:
                        token.market_data.price_change_percentage_1h_in_currency.usd === 0
                          ? Color.Blue
                          : token.market_data.price_change_percentage_1h_in_currency.usd > 0
                          ? Color.Green
                          : Color.Red,
                    }}
                  />
                )}
                {token.market_data.price_change_percentage_24h_in_currency.usd && (
                  <List.Item.Detail.Metadata.Label
                    title="Price Change (24h)"
                    text={`$${token.market_data.price_change_percentage_24h_in_currency.usd}`}
                    icon={{
                      source:
                        token.market_data.price_change_percentage_24h_in_currency.usd === 0
                          ? Icon.CircleFilled
                          : token.market_data.price_change_percentage_24h_in_currency.usd > 0
                          ? Icon.ArrowUpCircleFilled
                          : Icon.ArrowDownCircleFilled,
                      tintColor:
                        token.market_data.price_change_percentage_24h_in_currency.usd === 0
                          ? Color.Blue
                          : token.market_data.price_change_percentage_24h_in_currency.usd > 0
                          ? Color.Green
                          : Color.Red,
                    }}
                  />
                )}
                {token.market_data.price_change_percentage_7d_in_currency.usd && (
                  <List.Item.Detail.Metadata.Label
                    title="Price Change (7d)"
                    text={`$${token.market_data.price_change_percentage_7d_in_currency.usd.toString()}`}
                    icon={{
                      source:
                        token.market_data.price_change_percentage_7d_in_currency.usd === 0
                          ? Icon.CircleFilled
                          : token.market_data.price_change_percentage_7d_in_currency.usd > 0
                          ? Icon.ArrowUpCircleFilled
                          : Icon.ArrowDownCircleFilled,
                      tintColor:
                        token.market_data.price_change_percentage_7d_in_currency.usd === 0
                          ? Color.Blue
                          : token.market_data.price_change_percentage_7d_in_currency.usd > 0
                          ? Color.Green
                          : Color.Red,
                    }}
                  />
                )}
              </List.Item.Detail.Metadata>
            }
          />
        )
      }
    />
  );
};

export default TokenDetailListItem;
