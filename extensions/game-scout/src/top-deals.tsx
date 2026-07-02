import { useEffect, useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Cache,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface CheapSharkDeal {
  dealID: string;
  title: string;
  storeID: string;
  thumb: string;
  normalPrice: string;
  salePrice: string;
  savings: string;
  dealRating: string;
  metacriticLink?: string;
}

const STORES: { [key: string]: { name: string; color: Color } } = {
  "1": { name: "Steam", color: Color.Blue },
  "2": { name: "GamersGate", color: Color.SecondaryText },
  "3": { name: "Green Man Gaming", color: Color.Green },
  "4": { name: "Amazon", color: Color.Orange },
  "5": { name: "GameStop", color: Color.Red },
  "6": { name: "Direct2Drive", color: Color.SecondaryText },
  "7": { name: "GOG", color: Color.Purple },
  "8": { name: "Origin", color: Color.Orange },
  "9": { name: "Get Games", color: Color.SecondaryText },
  "10": { name: "ShinyLoot", color: Color.SecondaryText },
  "11": { name: "Humble Store", color: Color.Red },
  "12": { name: "Desura", color: Color.SecondaryText },
  "13": { name: "Uplay", color: Color.Blue },
  "14": { name: "IndieGameStand", color: Color.SecondaryText },
  "15": { name: "Fanatical", color: Color.Orange },
  "16": { name: "Gamesrocket", color: Color.SecondaryText },
  "17": { name: "Games Republic", color: Color.SecondaryText },
  "18": { name: "Sila Games", color: Color.SecondaryText },
  "19": { name: "Playfield", color: Color.SecondaryText },
  "20": { name: "ImperialGames", color: Color.SecondaryText },
  "21": { name: "WinGameStore", color: Color.SecondaryText },
  "22": { name: "FunStockDigital", color: Color.SecondaryText },
  "23": { name: "GameBillet", color: Color.SecondaryText },
  "24": { name: "Voidu", color: Color.SecondaryText },
  "25": { name: "Epic Games Store", color: Color.SecondaryText },
  "26": { name: "Razer Game Store", color: Color.SecondaryText },
  "27": { name: "Gamesplanet", color: Color.SecondaryText },
  "28": { name: "Gamesload", color: Color.SecondaryText },
  "29": { name: "2Game", color: Color.SecondaryText },
  "30": { name: "IndieGala", color: Color.SecondaryText },
  "31": { name: "Blizzard Shop", color: Color.SecondaryText },
  "32": { name: "AllYouPlay", color: Color.SecondaryText },
  "33": { name: "DLGamer", color: Color.SecondaryText },
  "34": { name: "Noctre", color: Color.SecondaryText },
  "35": { name: "DreamGame", color: Color.SecondaryText },
};

const CHEAPSHARK_MAP: Record<string, string> = {
  "1": "steam",
  "2": "gamersgate",
  "3": "gmg",
  "7": "gog",
  "8": "ea",
  "11": "humble",
  "13": "ubisoft",
  "15": "fanatical",
  "21": "wingamestore",
  "23": "gamebillet",
  "24": "voidu",
  "25": "epic",
  "27": "gamesplanet",
  "29": "2game",
  "30": "indiegala",
  "31": "blizzard",
  "32": "allyouplay",
  "33": "dlgamer",
};

const cache = new Cache();
export default function TopDeals() {
  const [deals, setDeals] = useState<CheapSharkDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStores, setSelectedStores] = useState<string[] | null>(null);

  const preferences = getPreferenceValues<Preferences.TopDeals>();
  const minDiscount = preferences.minDiscount || "0";
  const maxPrice = preferences.maxPrice || "9999";

  useEffect(() => {
    LocalStorage.getItem<string>("selected_stores").then((stored) => {
      if (stored) setSelectedStores(JSON.parse(stored));
      else setSelectedStores(["all"]);
    });
  }, []);

  useEffect(() => {
    const fetchDeals = async () => {
      setIsLoading(true);
      const cacheKey = `top_deals_${minDiscount}_${maxPrice}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsedData.timestamp;
        if (cacheAge < 60 * 60 * 1000) {
          setDeals(parsedData.deals);
          setIsLoading(false);
          return;
        }
      }

      try {
        const lowerPricePercent =
          parseFloat(minDiscount) > 0
            ? `&lowerPricePercent=${minDiscount}`
            : "";
        const response = await fetch(
          `https://www.cheapshark.com/api/1.0/deals?upperPrice=${maxPrice}&onSale=1&sortBy=Deal%20Rating${lowerPricePercent}`,
        );
        const data = (await response.json()) as CheapSharkDeal[];
        data.sort((a, b) => {
          const ratingDiff =
            parseFloat(b.dealRating) - parseFloat(a.dealRating);
          if (ratingDiff !== 0) return ratingDiff;
          const savingsDiff = parseFloat(b.savings) - parseFloat(a.savings);
          if (savingsDiff !== 0) return savingsDiff;
          return parseFloat(b.salePrice) - parseFloat(a.salePrice);
        });
        const filteredByDiscount = data.filter(
          (deal) => parseFloat(deal.savings) >= parseFloat(minDiscount),
        );

        cache.set(
          cacheKey,
          JSON.stringify({ timestamp: Date.now(), deals: filteredByDiscount }),
        );
        setDeals(filteredByDiscount);
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to load top deals",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeals();
  }, [minDiscount, maxPrice]);

  const filteredDeals = deals.filter((deal) => {
    if (selectedStores === null) return false;
    if (selectedStores.includes("all")) return true;
    const mappedId = CHEAPSHARK_MAP[deal.storeID] || "other";
    return selectedStores.includes(mappedId);
  });

  return (
    <List
      isLoading={isLoading || selectedStores === null}
      searchBarPlaceholder="Search top deals..."
    >
      {filteredDeals.map((deal) => {
        const store = STORES[deal.storeID] || {
          name: "Unknown",
          color: Color.SecondaryText,
        };
        const discount = Math.round(parseFloat(deal.savings));

        return (
          <List.Item
            key={deal.dealID}
            title={deal.title}
            subtitle={store.name}
            icon={{ source: deal.thumb, fallback: Icon.GameController }}
            accessories={[
              { text: `$${deal.normalPrice} → $${deal.salePrice}` },
              { tag: { value: `-${discount}%`, color: Color.Green } },
              {
                icon: { source: Icon.Star, tintColor: Color.Yellow },
                text: deal.dealRating
                  ? parseFloat(deal.dealRating).toFixed(1)
                  : "N/A",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="View Deal"
                  url={`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`}
                />
                <Action.CopyToClipboard
                  title="Copy Deal Link"
                  content={`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`}
                  shortcut={{
                    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    macOS: { modifiers: ["cmd", "shift"], key: "c" },
                  }}
                />

                {deal.metacriticLink && (
                  <>
                    <Action.OpenInBrowser
                      title="View Metacritic"
                      url={`https://www.metacritic.com${deal.metacriticLink}`}
                      shortcut={{
                        Windows: { modifiers: ["ctrl"], key: "m" },
                        macOS: { modifiers: ["cmd"], key: "m" },
                      }}
                      icon={Icon.BarChart}
                    />
                    <Action.CopyToClipboard
                      title="Copy Metacritic Link"
                      content={`https://www.metacritic.com${deal.metacriticLink}`}
                      shortcut={{
                        Windows: {
                          modifiers: ["ctrl", "shift", "alt"],
                          key: "c",
                        },
                        macOS: { modifiers: ["cmd", "shift", "opt"], key: "c" },
                      }}
                    />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
