import { List } from "@raycast/api";
import { Coin } from "../schema";
import { changeIcon, formatCurrency } from "../utils";

type SearchItemProps = Coin & {
  isLoading: boolean;
};

export default function SearchItemDetail({ name, symbol, market_cap_rank, market_data, isLoading }: SearchItemProps) {
  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        !isLoading ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={name} />
            <List.Item.Detail.Metadata.Label title="Symbol" text={symbol?.toUpperCase()} />

            <List.Item.Detail.Metadata.Separator />

            <List.Item.Detail.Metadata.Label
              title="Price(USD)"
              text={formatCurrency(market_data.current_price.usd, "usd")}
            />
            <List.Item.Detail.Metadata.Label
              title="Market Cap(USD)"
              text={`${formatCurrency(market_data.market_cap.usd, "usd")} (#${market_cap_rank})`}
            />

            <List.Item.Detail.Metadata.Separator />
            
            <List.Item.Detail.Metadata.Label
              icon={changeIcon(market_data.price_change_percentage_1h_in_currency.usd)}
              title="Change(1h)"
              text={`${Math.abs(market_data.price_change_percentage_1h_in_currency.usd)}%`}
            />
            <List.Item.Detail.Metadata.Label
              icon={changeIcon(market_data.price_change_percentage_24h_in_currency.usd)}
              title="Change(24h)"
              text={`${Math.abs(market_data.price_change_percentage_24h_in_currency.usd)}%`}
            />
            <List.Item.Detail.Metadata.Label
              icon={changeIcon(market_data.price_change_percentage_7d_in_currency.usd)}
              title="Change(7d)"
              text={`${Math.abs(market_data.price_change_percentage_7d_in_currency.usd)}%`}
            />
          </List.Item.Detail.Metadata>
        ) : null
      }
    />
  );
}
