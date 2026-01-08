import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  popToRoot,
  LocalStorage,
  Clipboard,
} from "@raycast/api";
import { getPrices, getNumber, getBalance } from "./api";

// Import recently used functions from get-phone-number
const RECENTLY_USED_KEY = "recently_used_service_countries";

interface RecentlyUsedEntry {
  serviceCode: string;
  countryIds: number[];
}

async function saveRecentlyUsedCountry(serviceCode: string, countryId: number): Promise<void> {
  try {
    const recentlyUsed = await LocalStorage.getItem(RECENTLY_USED_KEY);
    let entries: RecentlyUsedEntry[] = [];

    if (recentlyUsed) {
      try {
        const parsed = JSON.parse(recentlyUsed as string);
        entries = Array.isArray(parsed) ? [] : parsed;
      } catch {
        entries = [];
      }
    }

    // Find or create entry for this service
    let entry = entries.find((e) => e.serviceCode === serviceCode);
    if (!entry) {
      entry = { serviceCode, countryIds: [] };
      entries.push(entry);
    }

    // Remove countryId if it exists (to move it to front)
    entry.countryIds = entry.countryIds.filter((id) => id !== countryId);
    // Add to front
    entry.countryIds.unshift(countryId);
    // Limit to last 10
    entry.countryIds = entry.countryIds.slice(0, 10);

    await LocalStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Failed to save recently used country:", error);
  }
}

interface Preferences {
  apiKey: string;
}

interface FavoriteServiceCountry {
  serviceCode: string;
  serviceName: string;
  countryId: number;
  countryName: string;
}

const FAVORITE_SERVICE_COUNTRIES_KEY = "favorite_service_countries";

async function getFavoriteServiceCountries(): Promise<FavoriteServiceCountry[]> {
  try {
    const favorites = await LocalStorage.getItem(FAVORITE_SERVICE_COUNTRIES_KEY);
    if (favorites) {
      const parsed = JSON.parse(favorites as string);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("Failed to load favorite service countries:", error);
  }
  return [];
}

async function saveFavoriteServiceCountries(favorites: FavoriteServiceCountry[]): Promise<void> {
  await LocalStorage.setItem(FAVORITE_SERVICE_COUNTRIES_KEY, JSON.stringify(favorites));
}

async function removeFavoriteServiceCountry(serviceCode: string, countryId: number): Promise<void> {
  const favorites = await getFavoriteServiceCountries();
  const filtered = favorites.filter((fav) => !(fav.serviceCode === serviceCode && fav.countryId === countryId));
  await saveFavoriteServiceCountries(filtered);
}

function parseBalance(balanceString: string): number {
  // Balance comes as "ACCESS_BALANCE:123.45"
  if (balanceString.startsWith("ACCESS_BALANCE:")) {
    const amount = balanceString.replace("ACCESS_BALANCE:", "");
    return parseFloat(amount) || 0;
  }
  return parseFloat(balanceString) || 0;
}

export default function FavoriteServices() {
  const [favorites, setFavorites] = useState<FavoriteServiceCountry[]>([]);
  const [prices, setPrices] = useState<Record<string, Record<string, { cost: number; count: number }>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const preferences = getPreferenceValues<Preferences>();
        if (!preferences.apiKey) {
          return;
        }
        const balanceString = await getBalance();
        const balanceAmount = parseBalance(balanceString);
        setBalance(balanceAmount);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance(null);
      }
    }

    fetchBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const favoriteList = await getFavoriteServiceCountries();
        setFavorites(favoriteList);

        // Fetch prices for all favorite combinations
        const pricesData: Record<string, Record<string, { cost: number; count: number }>> = {};
        for (const fav of favoriteList) {
          try {
            const priceData = await getPrices(fav.serviceCode, fav.countryId);
            const countryIdStr = String(fav.countryId);
            const countryPrices = priceData[countryIdStr] || priceData[fav.countryId];
            const servicePrice = countryPrices?.[fav.serviceCode];
            if (servicePrice) {
              if (!pricesData[countryIdStr]) {
                pricesData[countryIdStr] = {};
              }
              pricesData[countryIdStr][fav.serviceCode] = {
                cost: servicePrice.cost,
                count: servicePrice.count,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch price for ${fav.serviceCode} in country ${fav.countryId}:`, error);
          }
        }
        setPrices(pricesData);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load favorites",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleActivate = async (favorite: FavoriteServiceCountry) => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Requesting phone number...",
      });

      const result = await getNumber(favorite.serviceCode, favorite.countryId);

      if (typeof result === "string") {
        throw new Error(result);
      }

      await toast.hide();

      // Save activation creation time to local storage for timer tracking
      const activationKey = `activation_${result.activationId}`;
      const createdAt = Date.now();
      const activationData = {
        activationId: result.activationId,
        createdAt,
      };
      await LocalStorage.setItem(activationKey, JSON.stringify(activationData));

      // Save to recently used
      await saveRecentlyUsedCountry(favorite.serviceCode, favorite.countryId);

      // Copy phone number to clipboard
      await Clipboard.copy(result.phoneNumber);

      // Show success message
      await showToast({
        style: Toast.Style.Success,
        title: "Phone Number Requested & Copied!",
        message: `Phone: ${result.phoneNumber}\nActivation ID: ${result.activationId}\n\nPhone number copied to clipboard.`,
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to request number",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleRemove = async (favorite: FavoriteServiceCountry) => {
    await removeFavoriteServiceCountry(favorite.serviceCode, favorite.countryId);
    const updated = await getFavoriteServiceCountries();
    setFavorites(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Removed from favorites",
      message: `${favorite.serviceName} - ${favorite.countryName}`,
    });
  };

  if (favorites.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.StarDisabled}
          title="No Favorite Services"
          description="Add service+country combinations from 'Get phone number' command to see them here"
        />
      </List>
    );
  }

  const balanceDisplay = balance !== null ? `$${balance.toFixed(2)}` : "Loading...";

  return (
    <List isLoading={isLoading}>
      {balance !== null && <List.Section title={`💰 Balance: ${balanceDisplay}`} key="balance-section" />}
      {favorites.map((favorite) => {
        const countryIdStr = String(favorite.countryId);
        const countryPrices = prices[countryIdStr] || prices[favorite.countryId];
        const servicePrice = countryPrices?.[favorite.serviceCode];
        const price = servicePrice?.cost ?? 0;
        const count = servicePrice?.count ?? 0;

        return (
          <List.Item
            key={`${favorite.serviceCode}-${favorite.countryId}`}
            title={favorite.serviceName}
            subtitle={favorite.countryName}
            icon={Icon.Star}
            accessories={[
              {
                text: `$${price.toFixed(3)}`,
              },
              {
                text: `${count} available`,
                icon: Icon.Phone,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Activate"
                  icon={Icon.Phone}
                  shortcut={{ modifiers: [], key: "enter" }}
                  onAction={() => handleActivate(favorite)}
                />
                <Action
                  title="Remove from Favorites"
                  icon={Icon.StarDisabled}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemove(favorite)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

// Export functions for use in other files
export { getFavoriteServiceCountries, saveFavoriteServiceCountries, FAVORITE_SERVICE_COUNTRIES_KEY };
export type { FavoriteServiceCountry };
