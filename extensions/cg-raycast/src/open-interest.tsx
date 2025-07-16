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
                  <List.Item.Detail.Metadata.Label title="价格" text={info.price ? formatPrice(info.price) : ""} />
                  <List.Item.Detail.Metadata.Label
                    title={`持仓量(${info.symbol})`}
                    text={`${info.openInterestAmount ? formatAmount(info.openInterestAmount) : ""} ${info.symbol}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="持仓量"
                    text={info.openInterest ? formatAmount(info.openInterest) : ""}
                  />
                  <List.Item.Detail.Metadata.Label title="占比" text={`${info.rate ? info.rate : ""} %`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="1h 持仓变化" text={`${info.h1OIChangePercent} %`} />
                  <List.Item.Detail.Metadata.Label title="4h 持仓变化" text={`${info.h4OIChangePercent} %`} />
                  <List.Item.Detail.Metadata.Label title="24h 持仓变化" text={`${info.h24Change} %`} />
                  <List.Item.Detail.Metadata.Separator />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
      {
        <List.Item
          title="总计"
          subtitle={`${marketData?.data?.length || 0} 个交易所`}
          accessories={[
            {
              text: formatAmount(totalOI),
              tooltip: `总持仓量：${formatAmount(totalOI)}`,
            },
            {
              text: formatAmount(totalVolume),
              tooltip: `总成交量：${formatAmount(totalVolume)}`,
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
