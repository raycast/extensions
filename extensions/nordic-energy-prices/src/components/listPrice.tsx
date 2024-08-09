import { PriceCurrency, PriceSuffix, PriceType } from "../types/energyData";
import { formatTime, relativeDate } from "../utils/dateConverter";
import { priceConverter } from "../utils/priceConverter";
import { Color, Icon, List } from "@raycast/api";

export const PriceEntry = ({ price }: { price: PriceType }) => {
  return (
    <List.Item
      icon={Icon.Clock}
      key={price.time_start}
      title={`${formatTime(price.time_start)} → ${formatTime(price.time_end)}`}
      subtitle={relativeDate(price.time_start)}
      accessories={[
        {
          text: {
            value: `${priceConverter(price[PriceCurrency])} ${PriceSuffix}`,
            color: Color.Green,
          },
        },
      ]}
    />
  );
};
