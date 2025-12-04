import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { StockDetail } from "./stock-detail";
import { changeIcon, formatMoney } from "./utils";
import yahooFinance, { Quote } from "./yahoo-finance";
import { ReactNode } from "react";

export default function StockListItem({ quote, actions }: { quote: Quote; actions: ReactNode }) {
  const priceInfo = yahooFinance.currentPriceInfo(quote);
  const icon = changeIcon(priceInfo.change);
  return (
    <List.Item
      key={quote.symbol}
      icon={icon}
      title={quote.symbol!}
      accessories={[
        {
          text: { value: formatMoney(priceInfo.price, quote.currency), color: icon.tintColor },
        },
      ]}
      detail={<StockDetail quote={quote} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Yahoo Finance"
            icon={Icon.Globe}
            url={`https://finance.yahoo.com/quote/${quote.symbol}`}
          />
          {actions}
        </ActionPanel>
      }
    />
  );
}
