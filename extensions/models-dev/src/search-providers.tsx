import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { ProviderListItem } from "./components/ProviderListItem";
import { fetchModelsData, INITIAL_MODELS_DATA } from "./lib/api";
import { Model, Provider } from "./lib/types";

// Stable empty arrays to avoid creating new instances
const EMPTY_MODELS: Model[] = [];
const EMPTY_PROVIDERS: Provider[] = [];

export default function SearchProviders() {
  const { data, isLoading } = useCachedPromise(fetchModelsData, [], {
    initialData: INITIAL_MODELS_DATA,
    keepPreviousData: true,
  });

  const modelsByProvider = useMemo(() => {
    const map = new Map<string, Model[]>();
    for (const model of data?.models ?? EMPTY_MODELS) {
      const existing = map.get(model.providerId) ?? [];
      existing.push(model);
      map.set(model.providerId, existing);
    }
    return map;
  }, [data?.models]);

  return (
    <List isLoading={isLoading && !data?.providers?.length} searchBarPlaceholder="Search providers...">
      <List.EmptyView
        title="No Providers Found"
        description="No providers match your search"
        icon={Icon.MagnifyingGlass}
      />
      <List.Section title="Providers">
        {(data?.providers ?? EMPTY_PROVIDERS).map((provider) => {
          const providerModels = modelsByProvider.get(provider.id) ?? EMPTY_MODELS;
          return <ProviderListItem key={provider.id} provider={provider} providerModels={providerModels} />;
        })}
      </List.Section>
    </List>
  );
}
