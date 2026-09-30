import { getPreferenceValues, Color, List } from "@raycast/api";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { useEffect, useState } from "react";
import { type Price, type Region, REGIONS, getAgilePrices } from "./api";

interface Preferences {
  region: Region;
  product_code: string;
  show_tags: boolean;
}

interface Tag {
  value: string | null;
  color?: Color;
}

interface Accessory {
  text?: {
    value: string;
    color?: Color;
  };
  tag?: Tag;
}

const THRESHOLDS = {
  FREE: {
    min: -1,
    max: 0,
    color: Color.Blue,
  },
  LOW: {
    min: 0,
    max: 10,
    color: Color.Green,
  },
  MEDIUM: {
    min: 10,
    max: 20,
    color: Color.Yellow,
  },
  HIGH: {
    min: 20,
    max: Infinity,
    color: Color.Red,
  },
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [prices, setPrices] = useState<Price[]>([]);

  useEffect(() => {
    getAgilePrices({
      region: preferences.region,
      productCode: preferences.product_code,
    }).then((result) => {
      setPrices(result);
      setIsLoading(false);
    });
  }, []);

  const renderListSection = (title: string, prices: Price[]) => (
    <List.Section title={title}>
      {prices.map((price, idx) => {
        const accessories: Accessory[] = [
          {
            text: {
              value: `${price.value_inc_vat.toFixed(2)}p/kwh`,
              color: getColor(price.value_inc_vat),
            },
          },
        ];

        if (preferences.show_tags) {
          const tag = getTag(price, prices);

          if (tag !== null) {
            accessories.unshift({ tag });
          }
        }

        return <List.Item key={idx} title={getTitle(price)} subtitle={getSubtitle(price)} accessories={accessories} />;
      })}
    </List.Section>
  );

  return (
    <List isLoading={isLoading}>
      {renderListSection(`Upcoming prices for ${REGIONS[preferences.region]}`, getUpcomingPrices(prices))}
      {renderListSection(`Past prices for ${REGIONS[preferences.region]}`, getPastPrices(prices))}
    </List>
  );
}

function getTag(price: Price, prices: Price[]): Tag | null {
  if (price.value_inc_vat < THRESHOLDS.FREE.max) {
    return {
      value: "You get paid!",
      color: getColor(price.value_inc_vat),
    };
  }

  if (price.value_inc_vat === THRESHOLDS.FREE.max) {
    return {
      value: "Free",
      color: getColor(price.value_inc_vat),
    };
  }

  const sortedPrices = [...prices].sort((a, b) => a.value_inc_vat - b.value_inc_vat);

  if (sortedPrices[0] === price) {
    return {
      value: "Cheapest",
      color: getColor(price.value_inc_vat),
    };
  } else if (sortedPrices[sortedPrices.length - 1] === price) {
    return {
      value: "Most Expensive",
      color: getColor(price.value_inc_vat),
    };
  } else {
    return null;
  }
}

function getUpcomingPrices(prices: Price[]): Price[] {
  const now = new Date();

  return prices
    .filter((price) => new Date(price.valid_to) > now)
    .sort((a, b) => new Date(a.valid_to).getTime() - new Date(b.valid_to).getTime());
}

function getPastPrices(prices: Price[]): Price[] {
  const now = new Date();

  return prices
    .filter((price) => new Date(price.valid_to) < now)
    .sort((a, b) => new Date(b.valid_to).getTime() - new Date(a.valid_to).getTime());
}

function getTitle(price: Price): string {
  const startDate = new Date(price.valid_from);
  const endDate = new Date(price.valid_to);

  return `${format(startDate, "H:mm")} - ${format(endDate, "H:mm")}`;
}

function getSubtitle(price: Price): string {
  const startDate = new Date(price.valid_from);
  const shortDate = format(startDate, "(dd/MM)");

  if (isYesterday(startDate)) {
    return `Yesterday ${shortDate}`;
  } else if (isToday(startDate)) {
    return `Today ${shortDate}`;
  } else if (isTomorrow(startDate)) {
    return `Tomorrow ${shortDate}`;
  } else {
    return format(startDate, "EEEE");
  }
}

function getColor(price: number): Color {
  if (price <= THRESHOLDS.FREE.max) {
    return THRESHOLDS.FREE.color;
  } else if (price <= THRESHOLDS.LOW.max) {
    return THRESHOLDS.LOW.color;
  } else if (price <= THRESHOLDS.MEDIUM.max) {
    return THRESHOLDS.MEDIUM.color;
  } else {
    return THRESHOLDS.HIGH.color;
  }
}
