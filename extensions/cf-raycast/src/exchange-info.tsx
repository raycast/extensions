import { Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { formatAmount } from "./utils";
import { fetchExchangeList } from "./utils/cg-api";
import { IExchangeInfo } from "./types/cg/exchange";

export default function Command() {
  const { data, isLoading } = useCachedPromise(fetchExchangeList);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Exchange" isShowingDetail={true}>
      {data?.data?.map((exchange: IExchangeInfo) => (
        <List.Item
          key={exchange.exchangeName}
          icon={
            exchange.logo
              ? { source: exchange.logo, mask: Image.Mask.Circle }
              : { source: Icon.Circle, mask: Image.Mask.Circle }
          }
          title={exchange.exchangeName}
          subtitle={exchange.exchangeName}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="24h Volume"
                    text={exchange.volUsd ? formatAmount(exchange.volUsd) : ""}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="24h Liquidation"
                    text={exchange.liquidationVolUsd ? formatAmount(exchange.liquidationVolUsd) : ""}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Open Interest"
                    text={exchange.openInterest ? formatAmount(exchange.openInterest) : ""}
                  />
                  <List.Item.Detail.Metadata.Label title="OI/24h Volume" text={exchange.oiVolRadio.toString()} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Taker Fees" text={`${exchange.takerFee.toString()} %`} />
                  <List.Item.Detail.Metadata.Label title="Marker Fees" text={`${exchange.makerFee.toString()} %`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Score" text={exchange.rating} />
                  <List.Item.Detail.Metadata.Separator />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
