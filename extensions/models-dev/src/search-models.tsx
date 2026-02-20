import { List, Icon } from "@raycast/api";
import { useState, useMemo } from "react";
import { useModelsData } from "./hooks/useModelsData";
import { ModelListSection } from "./components";
import { Capability, Model } from "./lib/types";
import { filterByCapability, sortByProviderThenName, filterOutDeprecated } from "./lib/filters";
import { ALL_CAPABILITIES, CAPABILITIES } from "./lib/constants";

export default function SearchAIModels() {
  const { data, isLoading } = useModelsData();
  const [capability, setCapability] = useState<Capability | "all">("all");
  const sectionTitle = "Models";

  const filteredModels = useMemo(() => {
    if (!data?.models) return [];

    let models: Model[] = data.models;

    // Filter out deprecated models
    models = filterOutDeprecated(models);

    // Filter by capability dropdown
    if (capability !== "all") {
      models = filterByCapability(models, capability);
    }

    // Sort by provider, then model name
    models = sortByProviderThenName(models);

    return models;
  }, [data?.models, capability]);

  return (
    <List
      isLoading={isLoading && !data?.models?.length}
      searchBarPlaceholder="Search models by name, provider, or capability..."
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
        title="No Models Found"
        description={
          capability !== "all"
            ? `No models found with ${CAPABILITIES[capability].label} capability`
            : "No models match your search"
        }
        icon={Icon.MagnifyingGlass}
      />
      <ModelListSection models={filteredModels} title={sectionTitle} />
    </List>
  );
}
