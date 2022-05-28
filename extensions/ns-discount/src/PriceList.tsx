import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchGameDetail } from "./api";
import { IGame, IPrice } from "./model";

export default function PriceList({ game }: { game: IGame }) {
  const [prices, setPrices] = useState<IPrice[]>([]);
  const [showPrices, setShowPrices] = useState<IPrice[]>([]);

  useEffect(() => {
    try {
      prices.length === 0 &&
        fetchGameDetail(game.appid).then((res) => {
          setPrices(res.prices);
          setShowPrices(res.prices);
        });
    } catch (error) {
      throw new Error("Failed to fetch game detail");
    }
  });

  const onSearchTextChanged = (text: string) => {
    if (text.length === 0) {
      setShowPrices(prices);
    } else {
      setShowPrices(prices.filter((price) => price.country.includes(text)));
    }
  };

  return (
    <List onSearchTextChange={onSearchTextChanged}>
      <List.Item key="name" title={game.titleZh} subtitle={game.title}></List.Item>
      <List.Item key="date" title="Discount Left" accessories={[{ text: game.leftDiscount.replace("天", " day") }]} />
      <List.Section title="Prices">
        {showPrices.map((price) => {
          return (
            <List.Item
              key={price.country}
              title={price.country}
              accessories={[
                { text: `${price.cutoff ? `【${price.cutoff} OFF】 - ` : ""}${price.price.toString()} CNY` },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
