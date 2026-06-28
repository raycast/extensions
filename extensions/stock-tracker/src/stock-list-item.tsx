import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { StockDetail } from "./stock-detail";
import { changeIcon, formatMoney } from "./utils";
import yahooFinance, { Quote } from "./yahoo-finance";
import { ReactNode } from "react";

const marketStateAccessory: Partial<Record<NonNullable<Quote["marketState"]>, List.Item.Accessory>> = {
  PRE: { icon: Icon.Sunrise, tooltip: "Pre-market price" },
  PREPRE: { icon: Icon.Sunrise, tooltip: "Pre-market price" },
  POST: { icon: Icon.Moon, tooltip: "Post-market price" },
  POSTPOST: { icon: Icon.Moon, tooltip: "Post-market price" },
};

export default function StockListItem({
  quote,
  actions,
  isFavorite,
}: {
  quote: Quote;
  actions: ReactNode;
  isFavorite?: boolean;
}) {
  const priceInfo = yahooFinance.currentPriceInfo(quote);
  const icon = changeIcon(priceInfo.change);
  const stateAccessory = quote.marketState ? marketStateAccessory[quote.marketState] : undefined;

  const subtitle = isFavorite ? { value: "★", tooltip: "In favorites" } : undefined;

  return (
    <List.Item
      icon={icon}
      title={quote.symbol!}
      subtitle={subtitle}
      accessories={[
        ...(stateAccessory ? [stateAccessory] : []),
        { text: { value: formatMoney(priceInfo.price, quote.currency), color: icon.tintColor } },
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
