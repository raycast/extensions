import { Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useLayers } from "./data";
import { LayerActionPanel, LayerListActions, conflictAccessory } from "./layer-actions";
import { LayerView } from "./layer-view";
import { LAYER_SORT_OPTIONS, sortLayers, type LayerSortOption } from "./sort";
import type { Layer } from "./types";

export default function RunLayer(props: LaunchProps<{ launchContext: { layer?: string } }>) {
  const { layers, isLoading, revalidate } = useLayers();
  const { push } = useNavigation();
  const requested = props.launchContext?.layer?.trim();
  const layer = requested ? layers.find((l) => l.id === requested) : undefined;
  const opened = useRef(false);

  // Push the requested layer on top of the layer list so Esc pops back to the
  // list (and Esc again returns to root search) instead of doing nothing.
  useEffect(() => {
    if (opened.current || !layer) return;
    opened.current = true;
    void push(<LayerView layerId={layer.id} />);
  }, [layer, push, revalidate]);

  return <LayerPicker layers={layers} isLoading={isLoading} requested={requested} revalidate={revalidate} />;
}

function LayerPicker({
  layers,
  isLoading,
  requested,
  revalidate,
}: {
  layers: Layer[];
  isLoading: boolean;
  requested?: string;
  revalidate: () => void;
}) {
  const [sort, setSort] = useState<LayerSortOption>("name-asc");
  const notFound = !isLoading && Boolean(requested) && layers.every((l) => l.id !== requested);
  const empty = !isLoading && layers.length === 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Pick a layer…"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort layers" value={sort} onChange={(value) => setSort(value as LayerSortOption)}>
          {LAYER_SORT_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
      actions={<LayerListActions mutate={revalidate} />}
    >
      {layers.length > 0 && (
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
      {notFound ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Layer not found"
          description={`No layer with id "${requested}". Its hotkey link may be out of date.`}
        />
      ) : empty ? (
        <List.EmptyView
          icon={Icon.Layers}
          title="No layers yet"
          description="Create a layer in Manage Layers, then give it a hotkey link."
          actions={<LayerListActions mutate={revalidate} />}
        />
      ) : null}
    </List>
  );
}
