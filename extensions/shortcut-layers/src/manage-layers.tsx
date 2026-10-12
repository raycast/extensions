import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { useLayers } from "./data";
import { LayerActionPanel, LayerListActions, conflictAccessory } from "./layer-actions";
import { LAYER_SORT_OPTIONS, sortLayers, type LayerSortOption } from "./sort";

export default function ManageLayers() {
  const { layers, isLoading, revalidate } = useLayers();
  const [sort, setSort] = useState<LayerSortOption>("name-asc");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search layers…"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort layers" value={sort} onChange={(value) => setSort(value as LayerSortOption)}>
          {LAYER_SORT_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
      actions={<LayerListActions mutate={revalidate} />}
    >
      {layers.length === 0 ? (
        <List.EmptyView
          icon={Icon.Layers}
          title="No layers yet"
          description="Create a layer, add actions with single keys, then give the layer a hotkey link."
          actions={<LayerListActions mutate={revalidate} />}
        />
      ) : (
        <List.Section title="Layers" subtitle={`${layers.length}`}>
          {sortLayers(layers, sort).map((layer) => (
            <List.Item
              key={layer.id}
              icon={layer.icon ?? Icon.Layers}
              title={layer.name}
              subtitle={`${layer.entries.length} actions`}
              accessories={conflictAccessory(layer)}
              actions={<LayerActionPanel layer={layer} mutate={revalidate} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
