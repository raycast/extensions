import { List, Icon, useNavigation } from "@raycast/api";
import { useState, useMemo } from "react";
import { useModelsData } from "./hooks/useModelsData";
import { ProviderListItem, ModelListSection } from "./components";
import { filterByCapability, filterByProvider } from "./lib/filters";
import { ALL_CAPABILITIES, CAPABILITIES } from "./lib/constants";
import { Capability, Model } from "./lib/types";

function ProviderModels({ providerId, providerName }: { providerId: string; providerName: string }) {
  const { data, isLoading } = useModelsData();
  const [capability, setCapability] = useState<Capability | "all">("all");
  const sectionTitle = "Models";

  const models = useMemo(() => {
    let filtered = data?.models ? filterByProvider(data.models, providerId) : [];
    if (capability !== "all") {
      filtered = filterByCapability(filtered, capability);
    }
    return filtered;
  }, [data?.models, providerId, capability]);

  return (
    <List
      isLoading={isLoading && !data?.models?.length}
      navigationTitle={providerName}
      searchBarPlaceholder={`Search ${providerName} models...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Capability"
          value={capability}
          onChange={(value) => setCapability(value as Capability | "all")}
        >
          <List.Dropdown.Item title="All Capabilities" value="all" icon={Icon.List} />
          <List.Dropdown.Section title="Capabilities">
            {ALL_CAPABILITIES.map((cap) => (
              <List.Dropdown.Item key={cap} title={CAPABILITIES[cap].label} value={cap} icon={CAPABILITIES[cap].icon} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Models"
        description={
          capability !== "all"
            ? `No ${providerName} models found with ${CAPABILITIES[capability].label} capability`
            : `No models found for ${providerName}`
        }
        icon={Icon.XMarkCircle}
      />
      <ModelListSection models={models} title={sectionTitle} />
    </List>
  );
}

export default function SearchAIProviders() {
  const { data, isLoading } = useModelsData();
  const { push } = useNavigation();
  const sectionTitle = "Providers";

  const modelsByProvider = useMemo(() => {
    const map = new Map<string, Model[]>();
    for (const model of data?.models ?? []) {
      const existing = map.get(model.providerId) ?? [];
      existing.push(model);
      map.set(model.providerId, existing);
    }
    return map;
  }, [data?.models]);

  const handleSelectProvider = (providerId: string) => {
    const provider = data?.providers.find((p) => p.id === providerId);
    if (provider) {
      push(<ProviderModels providerId={providerId} providerName={provider.name} />);
    }
  };

  return (
    <List isLoading={isLoading && !data?.providers?.length} searchBarPlaceholder="Search providers...">
      <List.EmptyView
        title="No Providers Found"
        description="No providers match your search"
        icon={Icon.MagnifyingGlass}
      />
      <List.Section title={sectionTitle}>
        {(data?.providers ?? []).map((provider) => (
          <ProviderListItem
            key={provider.id}
            provider={provider}
            providerModels={modelsByProvider.get(provider.id) ?? []}
            onSelect={handleSelectProvider}
          />
        ))}
      </List.Section>
    </List>
  );
}
