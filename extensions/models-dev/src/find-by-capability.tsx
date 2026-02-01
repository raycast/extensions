import { List, Icon, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useModelsData } from "./hooks/useModelsData";
import { ModelListSection } from "./components";
import { filterByCapability, countByCapability } from "./lib/filters";
import { ALL_CAPABILITIES, CAPABILITIES } from "./lib/constants";
import { Capability } from "./lib/types";

import { useMemo } from "react";

function CapabilityModels({ capability }: { capability: Capability }) {
  const { data, isLoading } = useModelsData();
  const capInfo = CAPABILITIES[capability];

  const models = useMemo(() => {
    return data?.models ? filterByCapability(data.models, capability) : [];
  }, [data?.models, capability]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={capInfo.label}
      searchBarPlaceholder={`Search models with ${capInfo.label.toLowerCase()}...`}
    >
      <List.EmptyView
        title="No Models Found"
        description={`No models found with ${capInfo.label} capability`}
        icon={Icon.XMarkCircle}
      />
      <ModelListSection models={models} />
    </List>
  );
}

export default function FindByCapability() {
  const { data, isLoading } = useModelsData();
  const { push } = useNavigation();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search capabilities...">
      <List.EmptyView title="Loading Capabilities" description="Fetching model data..." icon={Icon.Download} />
      {ALL_CAPABILITIES.map((capability) => {
        const capInfo = CAPABILITIES[capability];
        const count = data?.models ? countByCapability(data.models, capability) : 0;

        return (
          <List.Item
            key={capability}
            title={capInfo.label}
            subtitle={capInfo.description}
            icon={{ source: capInfo.icon, tintColor: capInfo.color }}
            accessories={[{ text: `${count} models` }]}
            actions={
              <ActionPanel>
                <Action
                  title="View Models"
                  icon={Icon.List}
                  onAction={() => push(<CapabilityModels capability={capability} />)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
