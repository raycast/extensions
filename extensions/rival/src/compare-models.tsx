// --------------------------------------------------------------------------
// Rival Raycast Extension - Compare AI Models
//
// Two-step flow: pick Model A, then Model B, then see the comparison.
// --------------------------------------------------------------------------

import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { fetchModels } from "./api.js";
import {
  getProviderIcon,
  getProviderName,
  pricingShort,
  sortModels,
  formatContextShort,
} from "./utils.js";
import CompareDetail from "./compare-detail.js";
import type { LensModel } from "./types.js";

// --------------------------------------------------------------------------
// Step 1: Pick Model A
// --------------------------------------------------------------------------

export default function CompareModelsCommand() {
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();
  const { data, isLoading } = usePromise(fetchModels);

  const models = data?.models ?? [];

  const filtered = useMemo(() => {
    const sorted = sortModels(models, "rank");
    if (!searchText.trim()) return sorted;
    const q = searchText.toLowerCase();
    return sorted.filter((m) => {
      const searchable = [
        m.name,
        m.id,
        getProviderName(m.provider),
        m.provider,
        ...m.bestFor,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [models, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Pick the first model to compare..."
      navigationTitle="Compare: Pick Model A"
      throttle
    >
      {!isLoading && filtered.length === 0 && (
        <List.EmptyView
          title="No models found"
          description="Try a different search term."
          icon={Icon.MagnifyingGlass}
        />
      )}

      {filtered.map((model) => (
        <List.Item
          key={model.id}
          title={model.name}
          subtitle={getProviderName(model.provider)}
          icon={getProviderIcon(model.provider)}
          accessories={buildAccessories(model)}
          actions={
            <ActionPanel>
              <Action
                title="Select as Model A"
                icon={Icon.ArrowRight}
                onAction={() =>
                  push(<PickModelB modelA={model} allModels={models} />)
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// --------------------------------------------------------------------------
// Step 2: Pick Model B
// --------------------------------------------------------------------------

function PickModelB({
  modelA,
  allModels,
}: {
  modelA: LensModel;
  allModels: LensModel[];
}) {
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const filtered = useMemo(() => {
    // Exclude the already-selected model
    const available = allModels.filter((m) => m.id !== modelA.id);
    const sorted = sortModels(available, "rank");
    if (!searchText.trim()) return sorted;
    const q = searchText.toLowerCase();
    return sorted.filter((m) => {
      const searchable = [
        m.name,
        m.id,
        getProviderName(m.provider),
        m.provider,
        ...m.bestFor,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [allModels, searchText, modelA.id]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Compare ${modelA.name} with...`}
      navigationTitle={`Compare: ${modelA.name} vs ?`}
      throttle
    >
      {filtered.length === 0 && (
        <List.EmptyView
          title="No models found"
          description="Try a different search term."
          icon={Icon.MagnifyingGlass}
        />
      )}

      {filtered.map((model) => (
        <List.Item
          key={model.id}
          title={model.name}
          subtitle={getProviderName(model.provider)}
          icon={getProviderIcon(model.provider)}
          accessories={buildAccessories(model)}
          actions={
            <ActionPanel>
              <Action
                title="Compare"
                icon={Icon.Switch}
                onAction={() => {
                  push(<CompareDetail modelA={modelA} modelB={model} />);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// --------------------------------------------------------------------------
// Shared accessory builder
// --------------------------------------------------------------------------

function buildAccessories(model: LensModel): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (model.rank != null) {
    accessories.push({
      tag: {
        value: `#${model.rank}`,
        color:
          model.rank <= 3
            ? Color.Yellow
            : model.rank <= 10
              ? Color.Green
              : Color.Blue,
      },
      tooltip: `Rival Index Rank #${model.rank}`,
    });
  }

  if (model.pricing) {
    accessories.push({
      text: pricingShort(model),
      tooltip: `${model.pricing.input} in / ${model.pricing.output} out per 1M tokens`,
    });
  }

  if (model.ctx != null) {
    accessories.push({
      text: formatContextShort(model.ctx),
    });
  }

  return accessories;
}
