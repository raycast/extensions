import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ProviderListItem } from "./components/ProviderListItem";
import { fetchModelsData } from "./lib/api";
import { Model, Provider } from "./lib/types";

// Stable empty arrays to avoid creating new instances
const EMPTY_MODELS: Model[] = [];
const EMPTY_PROVIDERS: Provider[] = [];

export default function SearchProviders() {
  // No initialData/keepPreviousData: holding a bundled snapshot copy alongside the
  // fetched catalog kept two full datasets resident and blew the 100 MB JS heap.
  // useCachedPromise already persists the last result across launches.
  const { data, isLoading } = useCachedPromise(fetchModelsData, []);

  const [searchText, setSearchText] = useState("");

  const modelsByProvider = useMemo(() => {
    const map = new Map<string, Model[]>();
    for (const model of data?.models ?? EMPTY_MODELS) {
      const existing = map.get(model.providerId) ?? [];
      existing.push(model);
      map.set(model.providerId, existing);
    }
    return map;
  }, [data?.models]);

  const filteredProviders = useMemo(() => {
    const providers = data?.providers ?? EMPTY_PROVIDERS;
    const query = searchText.trim().toLowerCase();
    if (!query) return providers;
    return providers.filter(
      (provider) => provider.name.toLowerCase().includes(query) || provider.id.toLowerCase().includes(query),
    );
  }, [data?.providers, searchText]);

  return (
    <List
      filtering={false}
      isLoading={isLoading && !data?.providers?.length}
      searchBarPlaceholder="Search providers..."
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView
        title="No Providers Found"
        description="No providers match your search"
        icon={Icon.MagnifyingGlass}
      />
      <List.Section
        title="Providers"
        subtitle={`${filteredProviders.length} provider${filteredProviders.length === 1 ? "" : "s"}`}
      >
        {filteredProviders.map((provider) => (
          <ProviderListItem
            key={provider.id}
            provider={provider}
            providerModels={modelsByProvider.get(provider.id) ?? EMPTY_MODELS}
          />
        ))}
      </List.Section>
    </List>
  );
}
