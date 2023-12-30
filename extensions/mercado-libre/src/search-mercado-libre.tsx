import { Action, ActionPanel, Grid, List, getPreferenceValues } from "@raycast/api";
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

export default function Command() {
  const { siteId, viewLayout, gridItemSize } = getPreferenceValues<Preferences>();
  const [searchQuery, setSearchQuery] = useCachedState<string>("searchQuery", "");

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

  return viewLayout === "grid" ? (
    <Grid
      isLoading={isLoading}
      columns={Number(gridItemSize)}
      searchBarPlaceholder="Search Mercado Libre"
      onSearchTextChange={setSearchQuery}
      throttle
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
      <Grid.EmptyView icon="mercado-libre-emptyview.png" title="No Results" />
    </Grid>
  ) : (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Mercado Libre"
      onSearchTextChange={setSearchQuery}
      throttle
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
      <List.EmptyView icon="mercado-libre-emptyview.png" title="No Results" />
    </List>
  );
}
