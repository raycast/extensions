import { List, ActionPanel, Action, Icon, showToast, Toast, showHUD, openExtensionPreferences, popToRoot } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import GameDetail from "./GameDetail";
import React from "react";
import { COMMON_COUNTRIES } from "./constants";
import { logBoth, getDefaultCountry, validateApiKey, getStorageKey } from "./utils";
import { ITADGame, ITADDeal } from "./types";

// Fetch the plain string for a game, fallback to slug if lookup fails
async function fetchPlainString(id: string, slug: string): Promise<string> {
  const { apiKey } = validateApiKey();
  const url = `https://api.isthereanydeal.com/games/lookup/v1?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(id)}`;
  logBoth("[fetchPlainString] Fetching plain for id:", id, "slug:", slug, "url:", url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logBoth("[fetchPlainString] Invalid API key detected");
        throw new Error("INVALID_API_KEY");
      }
      logBoth("[fetchPlainString] Lookup failed, using slug:", slug, "Status:", response.status);
      return slug;
    }
    const data = await response.json();
    logBoth("[fetchPlainString] Lookup response:", data);
    return data?.plain || slug;
  } catch (e) {
    logBoth("[fetchPlainString] Error:", e, "Falling back to slug:", slug);
    if (e instanceof Error && e.message === "INVALID_API_KEY") {
      throw e; // Re-throw to trigger API key setup
    }
    return slug;
  }
}

// Fetch current low price using POST, log full API response, support new response structure
async function fetchCurrentLowPrice(id: string, country: string): Promise<string> {
  const { isValid, apiKey } = validateApiKey();
  if (!isValid) {
    logBoth("[fetchCurrentLowPrice] Missing or invalid API key");
    return "";
  }
  if (!id) {
    logBoth("[fetchCurrentLowPrice] No id provided");
    return "";
  }
  const url = `https://api.isthereanydeal.com/games/prices/v3?key=${encodeURIComponent(apiKey)}&country=${encodeURIComponent(country)}`;
  logBoth("[fetchCurrentLowPrice] POSTing for id:", id, "url:", url);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([id]),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logBoth("[fetchCurrentLowPrice] Invalid API key detected");
        throw new Error("INVALID_API_KEY");
      }
      logBoth("[fetchCurrentLowPrice] API Error:", response.status, response.statusText);
      return "";
    }

    const data = await response.json();
    logBoth("[fetchCurrentLowPrice] Full API response for prices:", data);
    let priceInfo;
    if (Array.isArray(data)) {
      priceInfo = data.find((item) => item.id === id);
    } else {
      priceInfo = data[id];
    }
    if (!priceInfo || !Array.isArray(priceInfo.deals) || priceInfo.deals.length === 0) {
      logBoth("[fetchCurrentLowPrice] No prices found for id:", id);
      return "";
    }
    // Find the lowest price among all deals
    const lowest = priceInfo.deals.reduce((min: ITADDeal | null, deal: ITADDeal) => {
      if (!min || (deal.price?.amountInt || Infinity) < (min.price?.amountInt || Infinity)) return deal;
      return min;
    }, null);
    const result = lowest && lowest.price ? `${lowest.price.amount} ${lowest.price.currency}` : "";
    logBoth("[fetchCurrentLowPrice] Lowest price for id:", id, result);
    return result;
  } catch (e) {
    logBoth("[fetchCurrentLowPrice] Error fetching price for id", id, e);
    if (e instanceof Error && e.message === "INVALID_API_KEY") {
      throw e; // Re-throw to trigger API key setup
    }
    return "";
  }
}

async function searchIsThereAnyDeal(query: string, country: string): Promise<ITADGame[]> {
  const { isValid, apiKey } = validateApiKey();
  if (!isValid) {
    logBoth("[searchIsThereAnyDeal] Missing API Key");
    await showToast(Toast.Style.Failure, "Missing API Key", "Set your ITAD API key in extension preferences.");
    return [];
  }
  if (!query || typeof query !== "string" || query.trim() === "") {
    logBoth("[searchIsThereAnyDeal] Empty or invalid query");
    return [];
  }

  const url = `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}&results=20&country=${encodeURIComponent(country)}`;
  logBoth("[searchIsThereAnyDeal] Fetching search results for query:", query, "url:", url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logBoth("[searchIsThereAnyDeal] API Error:", response.status, response.statusText);

      // Handle specific API error cases
      if (response.status === 401) {
        await showToast(
          Toast.Style.Failure,
          "Invalid API Key",
          "Your API key appears to be incorrect. Please check your API key in extension preferences.",
        );
        throw new Error("INVALID_API_KEY");
      } else if (response.status === 403) {
        await showToast(
          Toast.Style.Failure,
          "API Key Restricted",
          "Your API key doesn't have permission for this request. Please check your API key.",
        );
        throw new Error("INVALID_API_KEY");
      } else if (response.status === 429) {
        await showToast(Toast.Style.Failure, "Rate Limited", "Too many requests. Please wait a moment and try again.");
        return [];
      } else if (response.status >= 500) {
        await showToast(
          Toast.Style.Failure,
          "Service Unavailable",
          "IsThereAnyDeal service is temporarily down. Please try again later.",
        );
        return [];
      } else {
        await showToast(
          Toast.Style.Failure,
          "API Error",
          `Error ${response.status}: ${response.statusText}. Please try again.`,
        );
        return [];
      }
    }
    const data = await response.json();
    logBoth("[searchIsThereAnyDeal] Search API response:", data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logBoth("[searchIsThereAnyDeal] Network Error:", errorMessage);
    if (error instanceof Error && error.message === "INVALID_API_KEY") {
      throw error; // Re-throw to trigger API key setup
    }
    await showToast(Toast.Style.Failure, "Network Error", errorMessage);
    return [];
  }
}

// API Key input component that appears inline when no API key is found
function ApiKeyInput() {
  async function handleSaveApiKey() {
    await openExtensionPreferences();
    await popToRoot();
  }

  return (
    <List.Item
      title="Enter API Key to Start Searching"
      subtitle="Get your free API key at isthereanydeal.com/app/"
      icon={Icon.Key}
      accessories={[{ text: "Required", icon: Icon.ExclamationMark }]}
      actions={
        <ActionPanel>
          <Action title="Enter API Key" icon={Icon.Pencil} onAction={handleSaveApiKey} />
          <Action.OpenInBrowser title="Get API Key" url="https://isthereanydeal.com/app/" icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const shouldFetch = searchText.length > 0;
  const [plainMap, setPlainMap] = useState<{ [id: string]: string }>({});
  const [prices, setPrices] = useState<{ [id: string]: string }>({});

  // useLocalStorage for country selection
  const { value: countryLS, setValue: setCountryLS } = useLocalStorage<string>(
    getStorageKey("COUNTRY"),
    getDefaultCountry(),
  );
  const countryToUse = countryLS || getDefaultCountry();

  // Check for missing API key
  const { isValid: hasValidApiKey } = validateApiKey();
  const missingApiKey = !hasValidApiKey;

  const { data, isLoading } = useCachedPromise(
    (query: string, country: string) => (shouldFetch ? searchIsThereAnyDeal(query, country) : Promise.resolve([])),
    [searchText, countryToUse],
    {
      execute: shouldFetch,
      initialData: [],
    },
  );
  const safeData: ITADGame[] = Array.isArray(data) ? data : [];

  // Map of id to plain (use slug as default, only call lookup if needed)
  React.useEffect(() => {
    if (safeData.length === 0) return;
    let cancelled = false;
    async function fetchAllPlains() {
      if (safeData.length === 0 || Object.keys(plainMap).length === safeData.length) return;
      const map: { [id: string]: string } = {};
      await Promise.all(
        safeData.map(async (game) => {
          map[game.id] = game.slug || (await fetchPlainString(game.id, game.slug));
        }),
      );
      logBoth("[fetchAllPlains] id to plain map:", map);
      // Only update if changed and not cancelled
      if (!cancelled && JSON.stringify(map) !== JSON.stringify(plainMap)) {
        setPlainMap(map);
      }
    }
    fetchAllPlains();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(safeData), shouldFetch, countryToUse]);

  // Map of id to current lowest price
  React.useEffect(() => {
    if (safeData.length === 0 || Object.keys(plainMap).length !== safeData.length) return;
    let cancelled = false;
    async function fetchAllPrices() {
      if (safeData.length === 0 || Object.keys(plainMap).length !== safeData.length) return;
      const priceMap: { [id: string]: string } = {};
      await Promise.all(
        safeData.map(async (game) => {
          if (game.id) priceMap[game.id] = await fetchCurrentLowPrice(game.id, countryToUse);
        }),
      );
      logBoth("[fetchAllPrices] id to price map:", priceMap);
      // Only update if changed and not cancelled
      if (!cancelled && JSON.stringify(priceMap) !== JSON.stringify(prices)) {
        setPrices(priceMap);
      }
    }
    fetchAllPrices();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(safeData), JSON.stringify(plainMap), shouldFetch, countryToUse]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for Games..." onSearchTextChange={setSearchText} throttle>
      {/* Show API key input if no API key is found */}
      {missingApiKey && <ApiKeyInput />}

      {/* Show search results if API key is available */}
      {!missingApiKey &&
        shouldFetch &&
        safeData.map((game: ITADGame) => (
          <List.Item
            key={game.id}
            title={game.title}
            subtitle={prices[game.id] ? `Lowest: ${prices[game.id]}` : ""}
            accessories={[
              { text: countryToUse, icon: Icon.Globe, tooltip: `Country: ${countryToUse}` },
              ...(game.assets?.boxart ? [{ icon: { source: game.assets.boxart } }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://isthereanydeal.com/game/${game.slug}/`} />
                <Action.Push
                  title="Show Details"
                  target={<GameDetail id={game.id} slug={plainMap[game.id] || game.slug} country={countryToUse} />}
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <ActionPanel.Submenu
                  title="Set Country/region"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                >
                  {COMMON_COUNTRIES.map((c) => (
                    <Action
                      key={c.code}
                      title={`${c.name} (${c.code})`}
                      onAction={async () => {
                        setCountryLS(c.code);
                        showHUD(`Country set to ${c.code}`);
                      }}
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel>
            }
          />
        ))}

      {/* Show helpful message when no search results and API key is available */}
      {!missingApiKey && !shouldFetch && (
        <List.Item
          title="Search for Games to Find Deals"
          subtitle="Type a Game Title to Search for Current Prices and Deals"
          icon={Icon.MagnifyingGlass}
          accessories={[{ text: countryToUse, icon: Icon.Globe, tooltip: `Country: ${countryToUse}` }]}
          actions={
            <ActionPanel>
              <ActionPanel.Submenu title="Set Country/region" icon={Icon.Globe}>
                {COMMON_COUNTRIES.map((c) => (
                  <Action
                    key={c.code}
                    title={`${c.name} (${c.code})`}
                    onAction={async () => {
                      setCountryLS(c.code);
                      showHUD(`Country set to ${c.code}`);
                    }}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
