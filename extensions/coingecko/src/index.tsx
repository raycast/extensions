import { ActionPanel, Detail, Icon, List, OpenInBrowserAction, PushAction, ToastStyle, showToast } from "@raycast/api";
import { useEffect, useState, useMemo } from "react";

import Service, { Coin } from "./service";
import { addFavorite, getFavorites, removeFavorite } from "./storage";
import { filterCoins, formatDate, formatPrice } from "./utils";

interface IdProps {
  id: string;
}

interface ListItemProps {
  coin: Coin;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
}

interface FavoriteProps {
  isFavorite: boolean;
  onToggle: () => void;
}

// Limit the number of list items rendered for performance
const ITEM_LIMIT = 1000;

const service = new Service();

export default function Command() {
  const service = new Service();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [input, setInput] = useState<string>("");
  const [favorites, setFavorites] = useState<string[]>([]);

  const list = useMemo(() => filterCoins(coins, input), [coins, input]);

  useEffect(() => {
    async function fetchList() {
      const coins = await service.getCoinList();
      setLoading(false);
      setCoins(coins);
    }

    async function fetchFavorites() {
      const favoriteList = await getFavorites();
      setFavorites(favoriteList);
    }

    fetchFavorites();
    fetchList();
  }, []);

  async function toggleFavorite(id: string, isFavorite: boolean) {
    if (isFavorite) {
      await removeFavorite(id);
    } else {
      await addFavorite(id);
    }
    const favoriteList = await getFavorites();
    setFavorites(favoriteList);
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setInput} searchBarPlaceholder="Search by coin name or symbol">
      <List.Section title="Favorites">
        {favorites.map((id) => {
          const coin = list.find((coin) => coin.id === id);
          if (!coin) return;
          return (
            <ListItemCoin key={id} coin={coin} isFavorite={true} onFavoriteToggle={() => toggleFavorite(id, true)} />
          );
        })}
      </List.Section>
      <List.Section title="All">
        {list.slice(0, ITEM_LIMIT).map((item) => {
          const { id } = item;
          const isFavorite = favorites.includes(id);
          return (
            <ListItemCoin
              key={id}
              coin={item}
              isFavorite={isFavorite}
              onFavoriteToggle={() => toggleFavorite(id, isFavorite)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ListItemCoin({ coin, isFavorite, onFavoriteToggle }: ListItemProps) {
  const { id, name, symbol } = coin;
  const subtitle = symbol.toUpperCase();
  const url = `https://www.coingecko.com/en/coins/${id}`;
  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      accessoryIcon={isFavorite ? Icon.Star : undefined}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={url} />
          <FavoriteAction isFavorite={isFavorite} onToggle={onFavoriteToggle} />
          <ActionPanel.Item
            icon={Icon.Text}
            title="Get Price"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={() => showPrice(id)}
          />
          <PushAction
            icon={Icon.Clock}
            title="Get Historical Price"
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            target={<HistoricalPrice id={id} />}
          />
          <PushAction
            icon={Icon.List}
            title="Get Info"
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<Info id={id} />}
          />
        </ActionPanel>
      }
    />
  );
}

function FavoriteAction(props: FavoriteProps) {
  const { isFavorite, onToggle } = props;
  const title = isFavorite ? "Remove from Favorites" : "Add to Favorites";
  return <ActionPanel.Item icon={Icon.Star} title={title} onAction={onToggle} />;
}

async function showPrice(id: string) {
  showToast(ToastStyle.Animated, "Fetching price…");
  const price = await service.getPrice(id);
  if (!price) {
    showToast(ToastStyle.Failure, "Failed to fetch the price");
    return;
  }
  const priceString = formatPrice(price);
  showToast(ToastStyle.Success, `Price: ${priceString}`);
}

function HistoricalPrice(props: IdProps) {
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchList() {
      const prices = await service.getCoinPriceHistory(props.id);
      setLoading(false);
      const markdown = prices
        .map(([timestamp, price]) => {
          const date = new Date(timestamp);
          const dateString = formatDate(date);
          const priceString = formatPrice(price);
          return `**${dateString}:** ${priceString}`;
        })
        .join("\n\n");
      setMarkdown(markdown);
    }

    fetchList();
  }, []);

  return <Detail isLoading={isLoading} markdown={markdown} />;
}

function Info(props: IdProps) {
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchList() {
      const { name, symbol, market_cap_rank, links } = await service.getCoinInfo(props.id);
      setLoading(false);
      const markdown = `
  **Name**: ${name}

  **Symbol**: ${symbol.toUpperCase()}

  **Market Cap Rank**: ${market_cap_rank}

  [Homepage](${links.homepage[0]})
      `;
      setMarkdown(markdown);
    }

    fetchList();
  }, []);

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
