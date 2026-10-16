import { LayersList } from "./layers-list";

export default function ManageLayers() {
  return (
    <LayersList
      placeholder="Search layers…"
      emptyDescription="Create a layer, add actions with single keys, then give the layer a hotkey link."
    />
  );
}
