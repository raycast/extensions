import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  useNavigation,
  getPreferenceValues,
  popToRoot,
  LocalStorage,
  Clipboard,
} from "@raycast/api";
import { getServicesList, getCountries, getPrices, getNumber, getBalance, Service, Country, PriceInfo } from "./api";
import { getFavoriteServiceCountries, saveFavoriteServiceCountries, FavoriteServiceCountry } from "./favorite-services";

interface Preferences {
  apiKey: string;
}

const FAVORITES_STORAGE_KEY = "favorite_services";
const RECENTLY_USED_KEY = "recently_used_service_countries";

interface RecentlyUsedEntry {
  serviceCode: string;
  countryIds: number[]; // Most recent first, limit to last 10
}

async function getRecentlyUsedCountries(serviceCode: string): Promise<number[]> {
  try {
    const recentlyUsed = await LocalStorage.getItem(RECENTLY_USED_KEY);
    if (recentlyUsed) {
      const parsed = JSON.parse(recentlyUsed as string);
      if (Array.isArray(parsed)) {
        // Old format - migrate
        return [];
      }
      const entries: RecentlyUsedEntry[] = parsed;
      const entry = entries.find((e) => e.serviceCode === serviceCode);
      return entry ? entry.countryIds : [];
    }
  } catch (error) {
    console.error("Failed to load recently used countries:", error);
  }
  return [];
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

async function getFavoriteServices(): Promise<Set<string>> {
  try {
    const favorites = await LocalStorage.getItem(FAVORITES_STORAGE_KEY);
    if (favorites) {
      const parsed = JSON.parse(favorites as string);
      return new Set(Array.isArray(parsed) ? parsed : []);
    }
  } catch (error) {
    console.error("Failed to load favorite services:", error);
  }
  return new Set<string>();
}

async function saveFavoriteServices(favorites: Set<string>): Promise<void> {
  await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
}

function parseBalance(balanceString: string): number {
  // Balance comes as "ACCESS_BALANCE:123.45"
  if (balanceString.startsWith("ACCESS_BALANCE:")) {
    const amount = balanceString.replace("ACCESS_BALANCE:", "");
    return parseFloat(amount) || 0;
  }
  return parseFloat(balanceString) || 0;
}

export default function GetPhoneNumber() {
  const [services, setServices] = useState<Service[]>([]);
  const [favoriteServices, setFavoriteServices] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    async function loadFavorites() {
      const favorites = await getFavoriteServices();
      setFavoriteServices(favorites);
    }
    loadFavorites();
  }, []);

  useEffect(() => {
    async function fetchServices() {
      try {
        setIsLoading(true);
        const preferences = getPreferenceValues<Preferences>();
        if (!preferences.apiKey) {
          await showToast({
            style: Toast.Style.Failure,
            title: "API Key Required",
            message: "Please configure your API key in Raycast preferences",
          });
          return;
        }

        const servicesList = await getServicesList();
        setServices(servicesList);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch services",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchServices();
  }, []);

  const toggleFavorite = async (serviceCode: string) => {
    const newFavorites = new Set(favoriteServices);
    if (newFavorites.has(serviceCode)) {
      newFavorites.delete(serviceCode);
    } else {
      newFavorites.add(serviceCode);
    }
    setFavoriteServices(newFavorites);
    await saveFavoriteServices(newFavorites);
  };

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchText.toLowerCase()) ||
      service.code.toLowerCase().includes(searchText.toLowerCase()),
  );

  // Separate favorites from regular services
  const favoriteServicesList = filteredServices.filter((service) => favoriteServices.has(service.code));
  const regularServicesList = filteredServices.filter((service) => !favoriteServices.has(service.code));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search services..." onSearchTextChange={setSearchText} throttle>
      {favoriteServicesList.length > 0 && (
        <List.Section title="Favorite Services" key="favorites-section">
          {favoriteServicesList.map((service) => (
            <List.Item
              key={service.code}
              title={service.name}
              icon={Icon.Star}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Service"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: [], key: "enter" }}
                    onAction={() => push(<CountrySelection service={service} />)}
                  />
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={() => toggleFavorite(service.code)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {regularServicesList.length > 0 && (
        <List.Section
          title={favoriteServicesList.length > 0 ? "Available Services" : undefined}
          key="all-services-section"
        >
          {regularServicesList.map((service) => (
            <List.Item
              key={service.code}
              title={service.name}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Service"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: [], key: "enter" }}
                    onAction={() => push(<CountrySelection service={service} />)}
                  />
                  <Action
                    title="Add to Favorites"
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={() => toggleFavorite(service.code)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

async function addToFavoriteServices(service: Service, country: Country) {
  try {
    const favorites = await getFavoriteServiceCountries();
    // Check if already exists
    const exists = favorites.some((fav) => fav.serviceCode === service.code && fav.countryId === country.id);
    if (exists) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Already in favorites",
        message: `${service.name} - ${country.eng} is already in your favorites`,
      });
      return;
    }

    const newFavorite: FavoriteServiceCountry = {
      serviceCode: service.code,
      serviceName: service.name,
      countryId: country.id,
      countryName: country.eng,
    };

    favorites.push(newFavorite);
    await saveFavoriteServiceCountries(favorites);
    await showToast({
      style: Toast.Style.Success,
      title: "Added to favorites",
      message: `${service.name} - ${country.eng}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add to favorites",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function CountrySelection({ service }: { service: Service }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [prices, setPrices] = useState<Record<string, Record<string, PriceInfo>>>({});
  const [recentlyUsedCountryIds, setRecentlyUsedCountryIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
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
    const balanceInterval = setInterval(fetchBalance, 30000);

    async function fetchData() {
      setIsLoading(true);
      let countriesError: Error | null = null;
      let pricesError: Error | null = null;

      // Load recently used countries for this service
      const recentlyUsed = await getRecentlyUsedCountries(service.code);
      setRecentlyUsedCountryIds(recentlyUsed);

      // Fetch countries
      try {
        const countriesList = await getCountries();
        setCountries(countriesList.filter((c) => c.visible === 1));
      } catch (error) {
        countriesError = error instanceof Error ? error : new Error(String(error));
        console.error("Failed to fetch countries:", countriesError);
      }

      // Fetch prices separately so one failure doesn't block the other
      try {
        const pricesData = await getPrices(service.code);
        setPrices(pricesData);
      } catch (error) {
        pricesError = error instanceof Error ? error : new Error(String(error));
        console.error("Failed to fetch prices:", pricesError);
      }

      // Show error toast if either failed
      if (countriesError || pricesError) {
        const errorMessages: string[] = [];
        if (countriesError) errorMessages.push(`Countries: ${countriesError.message}`);
        if (pricesError) errorMessages.push(`Prices: ${pricesError.message}`);

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch data",
          message: errorMessages.join("\n"),
        });
      }

      setIsLoading(false);
    }

    fetchData();

    return () => {
      if (balanceInterval) {
        clearInterval(balanceInterval);
      }
    };
  }, [service]);

  const filteredCountries = countries.filter(
    (country) =>
      country.eng.toLowerCase().includes(searchText.toLowerCase()) ||
      country.rus.toLowerCase().includes(searchText.toLowerCase()) ||
      String(country.id).includes(searchText),
  );

  // Separate recently used from all countries
  const recentlyUsedCountries = filteredCountries.filter((country) => recentlyUsedCountryIds.includes(country.id));
  const allOtherCountries = filteredCountries.filter((country) => !recentlyUsedCountryIds.includes(country.id));

  const renderCountryItem = (country: Country) => {
    // Prices structure: {countryId: {serviceCode: {cost, count, physicalCount}}}
    // Handle both string and number keys for country ID
    const countryIdStr = String(country.id);
    const countryPrices = prices[countryIdStr] || prices[country.id];
    const servicePrice = countryPrices?.[service.code];
    const price = servicePrice?.cost ?? 0;
    const count = servicePrice?.count ?? 0;
    const balanceDisplay = balance !== null ? `$${balance.toFixed(2)}` : "Loading...";

    return (
      <List.Item
        key={country.id}
        title={country.eng}
        subtitle={`$${price.toFixed(3)}`}
        accessories={[
          {
            text: `${count} available`,
            icon: Icon.Phone,
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={`Balance: ${balanceDisplay}`}
              icon={Icon.Coins}
              onAction={async () => {
                // Refresh balance on click
                try {
                  const preferences = getPreferenceValues<Preferences>();
                  if (preferences.apiKey) {
                    const balanceString = await getBalance();
                    const balanceAmount = parseBalance(balanceString);
                    setBalance(balanceAmount);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Balance Refreshed",
                      message: `Current balance: $${balanceAmount.toFixed(2)}`,
                    });
                  }
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to refresh balance",
                    message: error instanceof Error ? error.message : "Unknown error",
                  });
                }
              }}
            />
            <Action
              title="Request Number"
              icon={Icon.Phone}
              shortcut={{ modifiers: [], key: "enter" }}
              onAction={() => requestNumber(service.code, country.id)}
            />
            <Action
              title="Add to Favorite Services"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => addToFavoriteServices(service, country)}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      navigationTitle={`Select Country - ${service.name}`}
      isLoading={isLoading}
      searchBarPlaceholder="Search countries..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {recentlyUsedCountries.length > 0 && (
        <List.Section title="Recently Used" key="recently-used-section">
          {recentlyUsedCountries.map((country) => renderCountryItem(country))}
        </List.Section>
      )}
      {allOtherCountries.length > 0 && (
        <List.Section title="All Countries" key="all-countries-section">
          {allOtherCountries.map((country) => renderCountryItem(country))}
        </List.Section>
      )}
    </List>
  );
}

async function requestNumber(service: string, country: number) {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Requesting phone number...",
    });

    const result = await getNumber(service, country);

    if (typeof result === "string") {
      throw new Error(result);
    }

    await toast.hide();

    // Save activation creation time to local storage for timer tracking
    const activationKey = `activation_${result.activationId}`;
    const createdAt = Date.now();
    const activationData = {
      activationId: result.activationId,
      createdAt, // Store current timestamp in milliseconds
    };
    await LocalStorage.setItem(activationKey, JSON.stringify(activationData));
    console.log(`[DEBUG] Saved activation ${result.activationId} to local storage:`, {
      activationKey,
      createdAt,
      createdAtDate: new Date(createdAt).toISOString(),
      activationData,
    });

    // Save to recently used
    await saveRecentlyUsedCountry(service, country);

    // Copy phone number to clipboard
    await Clipboard.copy(result.phoneNumber);

    // Show success message with phone number copied notification
    await showToast({
      style: Toast.Style.Success,
      title: "Phone Number Requested & Copied!",
      message: `Phone: ${result.phoneNumber}\nActivation ID: ${result.activationId}\n\nPhone number copied to clipboard.`,
    });

    // Close the view after successful request
    await popToRoot();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to request number",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
