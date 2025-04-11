import { PriceCurrency, PriceSuffix, PriceType } from "../types/energyData";
import { formatTime } from "../utils/dateConverter";
import { priceConverter } from "../utils/priceConverter";
import { Color, Icon, List } from "@raycast/api";

export const PriceEntry = ({
  price,
  average,
  allData,
}: {
  price: PriceType;
  average: number;
  allData: PriceType[];
}) => {
  let priceColor;
  let isCheapest = false;
  let isMostExpensive = false;
  const priceValue = parseFloat(price[PriceCurrency]);

  // Find the cheapest and most expensive prices
  const cheapestPrice = Math.min(...allData.map((price) => parseFloat(price[PriceCurrency])));
  const mostExpensivePrice = Math.max(...allData.map((price) => parseFloat(price[PriceCurrency])));
  if (priceValue === cheapestPrice) {
    isCheapest = true;
  } else if (priceValue === mostExpensivePrice) {
    isMostExpensive = true;
  }

  switch (true) {
    case priceValue > average:
      priceColor = Color.Red;
      break;
    case priceValue < average:
      priceColor = Color.Green;
      break;
    case priceValue === average:
      priceColor = Color.Yellow;
      break;
    default:
      priceColor = Color.Green;
  }

  return (
    <List.Item
      id={`id${price.time_start}`}
      icon={Icon.Clock}
      key={price.time_start}
      title={`${formatTime(price.time_start)} → ${formatTime(price.time_end)}`}
      accessories={[
        {
          tag: isCheapest
            ? { value: "CHEAPEST HOUR ✅", color: priceColor }
            : isMostExpensive
              ? { value: "MOST EXPENSIVE HOUR ❌", color: priceColor }
              : "",
        },
        {
          tag: { value: `${priceConverter(priceValue)} ${PriceSuffix}`, color: priceColor },
        },
      ]}
    />
  );
};
