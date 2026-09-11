import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

interface Preferences {
  apiKey: string;
  country: string;
}

interface SteamPrice {
  currency?: string;
  initial?: number;
  final?: number;
}

interface SteamGame {
  id: number;
  name: string;
  tiny_image?: string;
  price?: SteamPrice;
}

interface SteamSearchResponse {
  total: number;
  items?: SteamGame[];
}

interface GamePrices {
  currency?: string;
  currentRetail?: string | number | null;
  currentKeyshops?: string | number | null;
  historicalRetail?: string | number | null;
  historicalKeyshops?: string | number | null;
}

interface GGGame {
  url: string;
  prices: GamePrices;
}

interface GGDealsResponse {
  success: boolean;
  data?: Record<string, GGGame | null>;
}

interface Result {
  steam: SteamGame;
  gg: GGGame | null;
}

const preferences = getPreferenceValues<Preferences>();

const COUNTRY_CURRENCIES: Record<string, string> = {
  BR: "BRL",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AR: "ARS",
  MX: "MXN",
  PT: "EUR",
  ES: "EUR",
  FR: "EUR",
  DE: "EUR",
  IT: "EUR",
  PL: "PLN",
  TR: "TRY",
  JP: "JPY",
  KR: "KRW",
  AU: "AUD",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
  IN: "INR",
};

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isNaN(number) ? null : number;
}

function getCountry() {
  return (preferences.country || "BR").toUpperCase();
}

function getCurrency(apiCurrency?: string) {
  if (apiCurrency && /^[A-Za-z]{3}$/.test(apiCurrency)) {
    return apiCurrency.toUpperCase();
  }

  return COUNTRY_CURRENCIES[getCountry()] ?? "USD";
}

function formatPrice(value?: number | null, currency?: string) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (value === 0) {
    return "Free";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: getCurrency(currency),
    currencyDisplay: "narrowSymbol",
  }).format(value);
}

function getCurrentLowest(prices?: GamePrices) {
  if (!prices) {
    return null;
  }

  const values = [toNumber(prices.currentRetail), toNumber(prices.currentKeyshops)].filter(
    (value): value is number => value !== null && value >= 0
  );

  return values.length ? Math.min(...values) : null;
}

function getAllTimeLow(prices?: GamePrices) {
  if (!prices) {
    return null;
  }

  const values = [toNumber(prices.historicalRetail), toNumber(prices.historicalKeyshops)].filter(
    (value): value is number => value !== null && value >= 0
  );

  return values.length ? Math.min(...values) : null;
}

function isHistoricalLow(prices?: GamePrices) {
  const current = getCurrentLowest(prices);
  const historical = getAllTimeLow(prices);

  if (current === null || historical === null) {
    return false;
  }

  return current <= historical + 0.01;
}

function getSteamRrp(game: SteamGame) {
  const initial = game.price?.initial;

  if (initial === undefined || initial === null || initial <= 0) {
    return null;
  }

  return initial / 100;
}

function getDiscount(originalPrice: number | null, currentPrice: number | null) {
  if (originalPrice === null || currentPrice === null || originalPrice <= 0 || currentPrice >= originalPrice) {
    return null;
  }

  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

function currenciesMatch(steamCurrency?: string, ggCurrency?: string) {
  const steam = steamCurrency?.toUpperCase();
  const gg = getCurrency(ggCurrency);

  if (!steam) {
    return true;
  }

  return steam === gg;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = searchText.trim();

    if (query.length < 2) {
      setResults([]);
      setError("");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function search() {
      setIsLoading(true);
      setError("");

      try {
        const country = getCountry();

        const steamUrl =
          "https://store.steampowered.com/api/storesearch/" +
          `?term=${encodeURIComponent(query)}` +
          "&l=english" +
          `&cc=${encodeURIComponent(country)}`;

        const steamResponse = await fetch(steamUrl, {
          signal: controller.signal,
        });

        if (!steamResponse.ok) {
          throw new Error(`Failed to search Steam (${steamResponse.status})`);
        }

        const steamData = (await steamResponse.json()) as SteamSearchResponse;

        const games = (steamData.items ?? []).slice(0, 10);

        if (!games.length) {
          setResults([]);
          setError("No games found.");
          return;
        }

        const ids = games.map((game) => game.id);

        const region = country.toLowerCase();

        const ggUrl =
          "https://api.gg.deals/v1/prices/by-steam-app-id/" +
          `?ids=${ids.join(",")}` +
          `&key=${encodeURIComponent(preferences.apiKey)}` +
          `&region=${encodeURIComponent(region)}`;

        const ggResponse = await fetch(ggUrl, {
          signal: controller.signal,
        });

        if (!ggResponse.ok) {
          throw new Error(`GG.deals request failed (${ggResponse.status})`);
        }

        const ggData = (await ggResponse.json()) as GGDealsResponse;

        if (!ggData.success) {
          throw new Error("GG.deals returned an error.");
        }

        const combined: Result[] = games.map((game) => ({
          steam: game,
          gg: ggData.data?.[String(game.id)] ?? null,
        }));

        setResults(combined);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setResults([]);
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    const timer = setTimeout(() => {
      void search();
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for a game..." onSearchTextChange={setSearchText} throttle>
      {!searchText && !isLoading && (
        <List.EmptyView icon={Icon.GameController} title="Search for a game" description="Example: The Game" />
      )}

      {error && !isLoading && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Something went wrong" description={error} />
      )}

      {results.map(({ steam, gg }) => {
        const currentPrice = getCurrentLowest(gg?.prices);

        const originalPrice = getSteamRrp(steam);

        const sameCurrency = currenciesMatch(steam.price?.currency, gg?.prices.currency);

        const discount = sameCurrency ? getDiscount(originalPrice, currentPrice) : null;

        const historicalLow = isHistoricalLow(gg?.prices);

        const currency = getCurrency(gg?.prices.currency);

        const priceText =
          currentPrice === null
            ? "No price"
            : originalPrice !== null && currentPrice < originalPrice && sameCurrency
            ? `${formatPrice(originalPrice, steam.price?.currency)} → ${formatPrice(currentPrice, currency)}`
            : formatPrice(currentPrice, currency);

        const ggUrl = gg?.url;

        const steamUrl = `https://store.steampowered.com/app/${steam.id}`;

        return (
          <List.Item
            key={steam.id}
            icon={steam.tiny_image || Icon.GameController}
            title={steam.name}
            accessories={[
              {
                text: priceText,
              },

              ...(discount !== null
                ? [
                    {
                      tag: {
                        value: `-${discount}%`,
                        color: Color.Green,
                      },
                    },
                  ]
                : []),

              ...(historicalLow
                ? [
                    {
                      tag: {
                        value: "🔥",
                      },
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                {ggUrl ? (
                  <Action.OpenInBrowser title="Open on GG.deals" url={ggUrl} />
                ) : (
                  <Action.OpenInBrowser title="Open on Steam" url={steamUrl} />
                )}

                {ggUrl && <Action.OpenInBrowser title="Open on Steam" url={steamUrl} />}

                <Action.CopyToClipboard title="Copy Steam App ID" content={String(steam.id)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
