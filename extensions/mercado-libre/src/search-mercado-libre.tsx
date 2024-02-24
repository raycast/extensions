import { Action, ActionPanel, Color, Grid, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { useCachedState, useFetch } from "@raycast/utils";

interface MercadoLibreItem {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  currency_id: string;
  permalink: string;
}

interface Preferences {
  siteId: string;
  viewLayout: string;
  gridItemSize: number;
}

const MAX_RECENT_SEARCHES = 7;

export default function Command() {
  const { siteId, viewLayout, gridItemSize } = getPreferenceValues<Preferences>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recentSearches, setRecentSearches] = useCachedState<string[]>("recentSearches", []);

  const { data, isLoading } = useFetch<MercadoLibreItem[]>(
    `https://api.mercadolibre.com/sites/${siteId}/search?q=${searchQuery}`,
    {
      execute: searchQuery.length > 0,
      keepPreviousData: true,
      parseResponse: async (response) => {
        const json = await response.json();
        return json.results;
      },
    },
  );

  useEffect(() => {
    if (searchQuery) {
      const updatedSearches = [searchQuery, ...recentSearches.filter((query) => query !== searchQuery)].slice(
        0,
        MAX_RECENT_SEARCHES,
      );
      setRecentSearches(updatedSearches);
    }
  }, [searchQuery]);

  const handleSearchSelect = (query: string) => {
    setSearchQuery(query);
  };

  const handleRemoveSearchItem = (query: string) => {
    setRecentSearches(recentSearches.filter((item) => item !== query));
  };

  const handleClearSearchHistory = () => {
    setRecentSearches([]);
  };

  const siteToLocaleMap: Record<string, string> = {
    MLA: "es-AR", // Argentina
    MBO: "es-BO", // Bolivia
    MLB: "pt-BR", // Brazil
    MLC: "es-CL", // Chile
    MCO: "es-CO", // Colombia
    MCR: "es-CR", // Costa Rica
    MRD: "es-DO", // Dominican Republic
    MSV: "es-SV", // El Salvador
    MGT: "es-GT", // Guatemala
    MHN: "es-HN", // Honduras
    MLM: "es-MX", // Mexico
    MNI: "es-NI", // Nicaragua
    MPA: "es-PA", // Panama
    MPY: "es-PY", // Paraguay
    MPE: "es-PE", // Peru
    MLU: "es-UY", // Uruguay
    MLV: "es-VE", // Venezuela
  };

  const formatPrice = (price: number, currency: string) => {
    const locale = siteToLocaleMap[siteId];
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(price);
  };

  if (recentSearches.length === 0 && searchQuery === "") {
    return (
      <List searchBarPlaceholder="Search Mercado Libre" onSearchTextChange={setSearchQuery} throttle>
        <List.EmptyView
          icon={{ source: "mercado-libre-emptyview.png", tintColor: Color.SecondaryText }}
          title="What's on your shopping list?"
        />
      </List>
    );
  } else if (recentSearches.length > 0 && searchQuery === "") {
    return (
      <List searchBarPlaceholder="Search Mercado Libre" onSearchTextChange={setSearchQuery} throttle>
        <List.Section title="Recent Searches">
          {recentSearches.map((query, index) => (
            <List.Item
              key={index}
              title={query}
              actions={
                <ActionPanel>
                  <Action title="Search" onAction={() => handleSearchSelect(query)} />
                  <Action title="Remove Search Item" onAction={() => handleRemoveSearchItem(query)} />
                  <Action title="Clear Search History" onAction={handleClearSearchHistory} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  } else {
    return viewLayout === "grid" ? (
      <Grid
        isLoading={isLoading}
        columns={Number(gridItemSize)}
        searchBarPlaceholder="Search Mercado Libre"
        onSearchTextChange={setSearchQuery}
        throttle
        searchText={searchQuery}
      >
        <Grid.Section title="Results" subtitle={`${data?.length} ${data?.length === 1 ? "item" : "items"}`}>
          {data?.map((item) => (
            <Grid.Item
              key={item.id}
              content={item.thumbnail.replace(/^http:/, "https:")}
              title={item.title}
              subtitle={formatPrice(item.price, item.currency_id)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`${item.permalink}`} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      </Grid>
    ) : (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search Mercado Libre"
        onSearchTextChange={setSearchQuery}
        throttle
        searchText={searchQuery}
      >
        <List.Section title="Results" subtitle={`${data?.length} ${data?.length === 1 ? "item" : "items"}`}>
          {data?.map((item) => (
            <List.Item
              key={item.id}
              title={item.title}
              accessories={[{ text: formatPrice(item.price, item.currency_id) }]}
              icon={item.thumbnail.replace(/^http:/, "https:")}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`${item.permalink}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }
}
