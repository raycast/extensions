import { LaunchProps } from "@raycast/api";
import { LayerView } from "./layer-view";
import { LayersList } from "./layers-list";

export default function RunLayer(props: LaunchProps<{ launchContext: { layer?: string } }>) {
  const requested = props.launchContext?.layer?.trim();
  // Go straight to the layer so nothing renders or animates before it.
  return requested ? (
    <LayerView layerId={requested} />
  ) : (
    <LayersList
      placeholder="Pick a layer…"
      emptyDescription="Create a layer in Manage Layers, then give it a hotkey link."
    />
  );
}
