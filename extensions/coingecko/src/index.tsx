import {
  ActionPanel,
  Icon,
  List,
  showToast,
  Action,
  Toast,
} from '@raycast/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { setTimeout } from 'timers/promises';

import Service, { Coin } from './service';
import { addFavorite, getFavorites, removeFavorite } from './storage';
import { formatDate, formatPrice, getPreferredCurrency } from './utils';

interface InfoProps {
  id: string;
}

interface ListItemProps {
  coin: Coin;
  isFavorite: boolean;
  isShowingDetail: boolean;
  onFavoriteToggle: () => void;
  onDetailToggle: () => void;
}

interface FavoriteProps {
  isFavorite: boolean;
  onToggle: () => void;
}

// Limit the number of list items rendered for performance
const ITEM_LIMIT = 100;

const service = new Service();
const fuseSearch = new Fuse<Coin>([], {
  keys: ['name', 'symbol'],
  includeScore: true,
  threshold: 0.3,
});

export default function Command() {
  const service = new Service();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => fuseSearch.setCollection(coins), [coins]);

  const filteredList = useMemo(
    () => fuseSearch.search(input, { limit: ITEM_LIMIT }).map((s) => s.item),
    [input],
  );

  useEffect(() => {
    async function fetchList() {
      try {
        const coins = await service.getCoinList();
        setLoading(false);
        setCoins(coins);
      } catch (e) {
        setLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to fetch the coin list',
        });
      }
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
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      onSearchTextChange={setInput}
      searchBarPlaceholder="Search by coin name or symbol"
    >
      <List.Section title="Favorites">
        {favorites.map((id) => {
          const coin = (input ? filteredList : coins).find(
            (coin) => coin.id === id,
          );
          if (!coin) return;
          return (
            <ListItemCoin
              key={id}
              coin={coin}
              isFavorite={true}
              onFavoriteToggle={() => toggleFavorite(id, true)}
              isShowingDetail={isShowingDetail}
              onDetailToggle={() => setIsShowingDetail(!isShowingDetail)}
            />
          );
        })}
      </List.Section>
      <List.Section title="All">
        {filteredList.map((item) => {
          const { id } = item;
          const isFavorite = favorites.includes(id);
          return (
            <ListItemCoin
              key={id}
              coin={item}
              isFavorite={isFavorite}
              onFavoriteToggle={() => toggleFavorite(id, isFavorite)}
              isShowingDetail={isShowingDetail}
              onDetailToggle={() => setIsShowingDetail(!isShowingDetail)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ListItemCoin({
  coin,
  isFavorite,
  onFavoriteToggle,
  onDetailToggle,
  isShowingDetail,
}: ListItemProps) {
  const { id, name, symbol } = coin;
  const subtitle = symbol.toUpperCase();
  const url = `https://www.coingecko.com/en/coins/${id}`;
  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      accessoryIcon={isFavorite ? Icon.Star : undefined}
      detail={isShowingDetail && <Info id={id} />}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Text}
            title={`${isShowingDetail ? 'Hide' : 'Show'} Info`}
            onAction={onDetailToggle}
          />
          <Action.OpenInBrowser url={url} />
          <FavoriteAction isFavorite={isFavorite} onToggle={onFavoriteToggle} />
          <Action
            icon={Icon.Text}
            title="Get Price"
            shortcut={{ modifiers: ['cmd'], key: 'p' }}
            onAction={() => showPrice(id)}
          />
        </ActionPanel>
      }
    />
  );
}

function FavoriteAction(props: FavoriteProps) {
  const { isFavorite, onToggle } = props;
  const title = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
  return <Action icon={Icon.Star} title={title} onAction={onToggle} />;
}

async function showPrice(id: string) {
  showToast({
    style: Toast.Style.Animated,
    title: 'Fetching price…',
  });
  const currency = getPreferredCurrency();
  const price = await service.getPrice(id, currency.id);
  if (!price) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Failed to fetch the price',
    });
    return;
  }
  const priceString = formatPrice(price, currency.id);
  showToast({
    style: Toast.Style.Success,
    title: priceString,
  });
}

function Info(props: InfoProps) {
  const [markdown, setMarkdown] = useState<string>('Loading...');
  const [isLoading, setLoading] = useState<boolean>(true);
  const shouldLoadInfo = useRef(true);
  const currency = getPreferredCurrency();

  useEffect(() => {
    const controller = new AbortController();

    async function fetchInfo() {
      // Debounce fetching info
      await setTimeout(300);
      if (shouldLoadInfo.current === false) return;

      const { name, symbol, market_cap_rank, links, market_data, image } =
        await service.getCoinInfo(props.id, controller.signal);
      const currentPrice = formatPrice(
        market_data.current_price[currency.id],
        currency.id,
      );
      const marketCapRank = market_cap_rank ? `#${market_cap_rank}` : 'Unknown';
      const historicalPrices = (
        await service.getCoinPriceHistory(props.id, 30, controller.signal)
      )
        .map(([timestamp, price]) => {
          const date = new Date(timestamp);

          return [formatDate(date), formatPrice(price, currency.id)];
        })
        .reverse() // Sort entries descending
        .slice(2); // Remove the first 2 entries as they will be for the current date

      setMarkdown(`&nbsp;![](${image.small})
# ${name} (${symbol.toUpperCase()})
[${links.homepage[0]}](${links.homepage[0]})

###

**Market Cap Rank** ${marketCapRank}

###

**Current Price** ${currentPrice}

###

**Historical Prices (Last 30 Days)**

###

${historicalPrices
  .map(([date, price]) => {
    return `- _${date} -_ **${price}**`;
  })
  .join('\n\n')}`);
      setLoading(false);
    }

    fetchInfo().catch((err) => {
      if (err.message === 'cancelled') return;

      setMarkdown('Failed to fetch coin info');
      setLoading(false);
    });

    return () => {
      controller.abort();
      shouldLoadInfo.current = false;
    };
  }, []);

  return <List.Item.Detail isLoading={isLoading} markdown={markdown} />;
}
