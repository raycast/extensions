import { Icon, Image, List } from "@raycast/api";
import type { Quote } from "./yahoo-finance";
import yahooFinance from "./yahoo-finance";
import { changeIcon, formatPercent, stockLogoUrl } from "./utils";

const MARKET_STATE_ACCESSORY: Partial<Record<string, List.Item.Accessory>> = {
  PRE: { icon: Icon.Sunrise, tooltip: "Pre-market price" },
  PREPRE: { icon: Icon.Sunrise, tooltip: "Pre-market price" },
  POST: { icon: Icon.Moon, tooltip: "Post-market price" },
  POSTPOST: { icon: Icon.Moon, tooltip: "Post-market price" },
};

export default function StockListItem({
  quote,
  actions,
  detail,
  isFavorite,
  intervalChangePercent,
}: {
  quote: Quote;
  actions: List.Item.Props["actions"];
  detail: List.Item.Props["detail"];
  isFavorite?: boolean;
  intervalChangePercent?: number;
}) {
  const priceInfo = yahooFinance.currentPriceInfo(quote);
  const displayChange = intervalChangePercent ?? priceInfo.changePercent;
  const arrow = changeIcon(displayChange);
  const stateAccessory = quote.marketState
    ? MARKET_STATE_ACCESSORY[quote.marketState]
    : undefined;

  const logoUrl = stockLogoUrl(quote.symbol);
  const icon: Image.ImageLike = {
    source: logoUrl,
    mask: Image.Mask.RoundedRectangle,
    fallback: arrow.source,
  };

  const accessories: List.Item.Accessory[] = [];
  if (stateAccessory) accessories.push(stateAccessory);
  accessories.push({
    tag: {
      value: formatPercent(displayChange),
      color: arrow.tintColor,
    },
  });

  const subtitle = isFavorite
    ? { value: "★", tooltip: "In favorites" }
    : undefined;

  return (
    <List.Item
      id={quote.symbol}
      title={quote.displayName || quote.shortName || quote.symbol}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      detail={detail}
      actions={actions}
    />
  );
}
