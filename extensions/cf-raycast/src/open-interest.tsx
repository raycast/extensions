import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { IOpenInterestInfo } from "./types/cg/oi";
import { formatAmount, formatPrice } from "./utils";
import { fetchCoins, fetchOpenInterest } from "./utils/cg-api";

function OpenInterestDetail({ symbol }: { symbol: string }) {
  const { data: marketData, isLoading } = useCachedPromise(
    async (symbol: string) => {
      return await fetchOpenInterest(symbol);
    },
    [symbol],
  );
  const totalOI =
    marketData?.data?.reduce((sum: number, tick: IOpenInterestInfo) => sum + tick.openInterestAmount, 0) || 0;
  const totalVolume = marketData?.data?.reduce((sum: number, tick: IOpenInterestInfo) => sum + tick.volUsd, 0) || 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Loading..." isShowingDetail={true}>
      {marketData?.data.map((info: IOpenInterestInfo) => (
        <List.Item
          key={info.exchangeName}
          title={info.exchangeName}
          icon={{ source: info.exchangeLogo, mask: Image.Mask.Circle }}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Price" text={info.price ? formatPrice(info.price) : ""} />
                  <List.Item.Detail.Metadata.Label
                    title={`OI (${info.symbol})`}
                    text={`${info.openInterestAmount ? formatAmount(info.openInterestAmount) : ""} ${info.symbol}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="持仓量"
                    text={info.openInterest ? formatAmount(info.openInterest) : ""}
                  />
                  <List.Item.Detail.Metadata.Label title="Rate" text={`${info.rate ? info.rate : ""} %`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="1h Change" text={`${info.h1OIChangePercent} %`} />
                  <List.Item.Detail.Metadata.Label title="4h Change" text={`${info.h4OIChangePercent} %`} />
                  <List.Item.Detail.Metadata.Label title="24h Change" text={`${info.h24Change} %`} />
                  <List.Item.Detail.Metadata.Separator />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
      {
        <List.Item
          title=""
          subtitle={`${marketData?.data?.length || 0} Exchanges`}
          accessories={[
            {
              text: formatAmount(totalOI),
              tooltip: `Total OI：${formatAmount(totalOI)}`,
            },
            {
              text: formatAmount(totalVolume),
              tooltip: `Total Volume：${formatAmount(totalVolume)}`,
            },
          ]}
        />
      }
    </List>
  );
}

export default function Command(props: { arguments: { symbol?: string } }) {
  const { symbol } = props.arguments;
  const { data: coinsData, isLoading } = useCachedPromise(fetchCoins);
  if (symbol) {
    return <OpenInterestDetail symbol={symbol} />;
  }
  return (
    <List isLoading={isLoading} searchBarPlaceholder="查询币种 OI">
      {coinsData?.data?.map((coin) => (
        <List.Item
          key={coin.symbol}
          icon={
            coin.coinLogo
              ? { source: coin.coinLogo, mask: Image.Mask.Circle }
              : { source: Icon.Circle, mask: Image.Mask.Circle }
          }
          title={coin.symbol}
          subtitle={coin.coinName}
          actions={
            <ActionPanel>
              <Action.Push
                title="查看 Oi"
                target={<OpenInterestDetail symbol={coin.symbol} key={coin.symbol} />}
                icon={Icon.BarChart}
              />
              <Action.OpenInBrowser
                title="Open in Coinglass"
                url={`https://www.coinglass.com/currencies/${coin.symbol}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
