import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { QUOTE_ASSET } from "./utils/lib";
import useSymbols from "./utils/useSymbols";
import useTicker from "./utils/useTicker";

export default function Command() {
  const [coin, setCoin] = useState<string | null>(null);

  const { symbols, isLoadingSymbols } = useSymbols();
  const { tickerData, isLoadingTicker } = useTicker(coin);

  useEffect(() => {
    if (symbols.length > 0) {
      setCoin(symbols[0]);
    }
  }, [symbols]);

  return (
    <List isLoading={isLoadingTicker && isLoadingSymbols} isShowingDetail>
      {symbols.map((symbol) => (
        <List.Item
          key={symbol?.toUpperCase()}
          title={symbol ? `${symbol.toUpperCase()}/${QUOTE_ASSET.toUpperCase()}` : ""}
          actions={
            <ActionPanel>
              <Action
                title={symbol ? `View ${symbol.toUpperCase()}` : ""}
                onAction={() => {
                  setCoin(symbol);
                }}
              />
              <Action.OpenInBrowser
                url={`https://wazirx.com/exchange/${symbol?.toUpperCase()}-${QUOTE_ASSET.toUpperCase()}`}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title={coin ? coin.toUpperCase() : ""} />
                  <List.Item.Detail.Metadata.Label
                    title="Open Price"
                    text={tickerData ? `${tickerData.openPrice} ${QUOTE_ASSET.toUpperCase()}` : "?"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Low Price"
                    text={tickerData ? `${tickerData.lowPrice} ${QUOTE_ASSET.toUpperCase()}` : "?"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="High Price"
                    text={tickerData ? `${tickerData.highPrice} ${QUOTE_ASSET.toUpperCase()}` : "?"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Last Price"
                    text={tickerData ? `${tickerData.lastPrice} ${QUOTE_ASSET.toUpperCase()}` : "?"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Bid Price"
                    text={tickerData ? `${tickerData.bidPrice} ${QUOTE_ASSET.toUpperCase()}` : "?"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Ask Price"
                    text={tickerData ? `${tickerData.askPrice} ${QUOTE_ASSET.toUpperCase()}` : "?"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
