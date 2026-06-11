import { List, Icon, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useMemo, useState, useCallback } from "react";
import { useModelsData } from "./hooks/useModelsData";
import { ModelListSection } from "./components";
import { filterByCapabilities, filterOutDeprecated, sortByProviderThenName } from "./lib/filters";
import { ALL_CAPABILITIES, CAPABILITIES } from "./lib/constants";
import { Capability, Model } from "./lib/types";

// Stable accessory arrays to avoid creating new instances
const SELECTED_ACCESSORIES: List.Item.Accessory[] = [{ icon: Icon.CheckCircle, tooltip: "Selected" }];
const EMPTY_ACCESSORIES: List.Item.Accessory[] = [];
const EMPTY_MODELS: Model[] = [];

type CapabilityResultsViewProps = {
  models: Model[];
  isLoading: boolean;
  selectedCapabilities: Capability[];
};

function CapabilityResultsView({ models, isLoading, selectedCapabilities }: CapabilityResultsViewProps) {
  const selectedLabels = useMemo(
    () => selectedCapabilities.map((cap) => CAPABILITIES[cap].label).join(" + "),
    [selectedCapabilities],
  );

  const sectionTitle = useMemo(() => {
    return selectedCapabilities.length > 0 ? `Models with: ${selectedLabels}` : "All Models";
  }, [selectedCapabilities, selectedLabels]);

  const filteredModels = useMemo(() => {
    let filtered: Model[] = models;
    filtered = filterOutDeprecated(filtered);
    filtered = filterByCapabilities(filtered, selectedCapabilities);
    return sortByProviderThenName(filtered);
  }, [models, selectedCapabilities]);

  return (
    <List
      isLoading={isLoading && !models?.length}
      navigationTitle={selectedLabels || "All Models"}
      searchBarPlaceholder="Search models..."
    >
      <List.EmptyView
        title="No Models Found"
        description={
          selectedCapabilities.length > 0 ? `No models match ${selectedLabels}` : "No models match your search"
        }
        icon={Icon.MagnifyingGlass}
      />
      <ModelListSection models={filteredModels} title={sectionTitle} />
    </List>
  );
}

type CapabilitySelectionViewProps = {
  isLoading: boolean;
  selectedCapabilities: Capability[];
  onToggle: (capability: Capability) => void;
  onClear: () => void;
  onShowResults: () => void;
};

function CapabilitySelectionView({
  isLoading,
  selectedCapabilities,
  onToggle,
  onClear,
  onShowResults,
}: CapabilitySelectionViewProps) {
  const selectedSet = useMemo(() => new Set(selectedCapabilities), [selectedCapabilities]);
  const selectedCount = selectedCapabilities.length;

  const renderCapabilityItem = useCallback(
    (capability: Capability) => {
      const capInfo = CAPABILITIES[capability];
      const isSelected = selectedSet.has(capability);
      const accessories = isSelected ? SELECTED_ACCESSORIES : EMPTY_ACCESSORIES;

      return (
        <List.Item
          key={capability}
          title={capInfo.label}
          subtitle={capInfo.description}
          icon={capInfo.icon}
          accessories={accessories}
          keywords={[capability, capInfo.label]}
          actions={
            <ActionPanel>
              <Action
                title={isSelected ? "Remove Capability" : "Add Capability"}
                icon={isSelected ? Icon.MinusCircle : Icon.PlusCircle}
                onAction={() => onToggle(capability)}
              />
              {selectedCount > 0 && (
                <ActionPanel.Section>
                  <Action
                    title="Show Matching Models"
                    icon={Icon.ArrowRight}
                    onAction={onShowResults}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action title="Clear Selected Capabilities" icon={Icon.XMarkCircle} onAction={onClear} />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      );
    },
    [selectedSet, selectedCount, onToggle, onShowResults, onClear],
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search capabilities...">
      {selectedCount > 0 && (
        <List.Section title={`Selected (${selectedCount})`}>
          {ALL_CAPABILITIES.filter((capability) => selectedSet.has(capability)).map(renderCapabilityItem)}
        </List.Section>
      )}
      <List.Section title="Capabilities">
        {ALL_CAPABILITIES.filter((capability) => !selectedSet.has(capability)).map(renderCapabilityItem)}
      </List.Section>
    </List>
  );
}

export default function AIModelsByCapability() {
  const { data, isLoading } = useModelsData();
  const { push } = useNavigation();
  const [selectedCapabilities, setSelectedCapabilities] = useState<Capability[]>([]);

  const toggleCapability = useCallback((capability: Capability) => {
    setSelectedCapabilities((current) =>
      current.includes(capability) ? current.filter((cap) => cap !== capability) : [...current, capability],
    );
  }, []);

  const handleClear = useCallback(() => {
    setSelectedCapabilities([]);
  }, []);

  const handleShowResults = useCallback(() => {
    const models = data?.models ?? EMPTY_MODELS;
    push(
      <CapabilityResultsView models={models} isLoading={isLoading} selectedCapabilities={[...selectedCapabilities]} />,
    );
  }, [data?.models, isLoading, selectedCapabilities, push]);

  return (
    <CapabilitySelectionView
      isLoading={isLoading && !data?.models?.length}
      selectedCapabilities={selectedCapabilities}
      onToggle={toggleCapability}
      onClear={handleClear}
      onShowResults={handleShowResults}
    />
  );
}
