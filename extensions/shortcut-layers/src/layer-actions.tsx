import { Action, ActionPanel, Alert, Icon, Keyboard, List, confirmAlert, open, showToast, Toast } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { loadLayers, saveLayers } from "./data";
import { LayerForm } from "./form-layer";
import { LayerView } from "./layer-view";
import { duplicateKeys, quicklinkName } from "./schema";
import type { Layer } from "./types";

const COMMAND_NAME = "run-layer";

export function hotkeyLink(layer: Layer): string {
  return createDeeplink({ command: COMMAND_NAME, context: { layer: layer.id } });
}

export function conflictAccessory(layer: Layer): List.Item.Accessory[] {
  const dupes = duplicateKeys(layer.entries);
  return dupes.length > 0 ? [{ icon: Icon.Warning, text: `duplicate key: ${dupes.join(", ")}` }] : [];
}

/** Opens the built-in Search Quicklinks command, filtered to this layer's quicklink. */
export function quicklinksSearchLink(name: string): string {
  return `raycast://extensions/raycast/quicklinks/search-quicklinks?fallbackText=${encodeURIComponent(name)}`;
}

/** Global actions for a layers list (no item selected). */
export function LayerListActions({ mutate }: { mutate: () => void }) {
  return (
    <ActionPanel>
      <Action.Push
        title="Create Layer"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<LayerForm mutate={mutate} />}
      />
    </ActionPanel>
  );
}

/** Per-layer actions, shared by Manage Layers and the Run Layer picker. */
export function LayerActionPanel({ layer, mutate }: { layer: Layer; mutate: () => void }) {
  const name = quicklinkName(layer.name);
  return (
    <ActionPanel>
      <Action.Push title="Open Layer" icon={Icon.Layers} target={<LayerView layerId={layer.id} />} />
      <Action.Push
        title="Edit Layer"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<LayerForm existing={layer} mutate={mutate} />}
      />
      <Action.Push
        title="Create Layer"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<LayerForm mutate={mutate} />}
      />
      <ActionPanel.Section>
        <Action.CreateQuicklink
          title="Create Quicklink (First Time Only)"
          icon={Icon.Link}
          quicklink={{ name, link: hotkeyLink(layer) }}
        />
        <Action title="Set or Update Hotkey…" icon={Icon.Keyboard} onAction={() => open(quicklinksSearchLink(name))} />
        <Action.CopyToClipboard title="Copy Layer Deeplink" content={hotkeyLink(layer)} />
        <Action
          title="Delete Layer"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => deleteLayer(layer, mutate)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function deleteLayer(layer: Layer, mutate: () => void) {
  const confirmed = await confirmAlert({
    title: `Delete "${layer.name}"?`,
    message: `This cannot be undone. Also delete its Quicklink ("${quicklinkName(layer.name)}") in Search Quicklinks, otherwise it stays behind and opens a missing layer.`,
    primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
  });
  if (!confirmed) return;
  const layers = await loadLayers();
  await saveLayers(layers.filter((l) => l.id !== layer.id));
  mutate();
  showToast({ style: Toast.Style.Success, title: "Layer deleted" });
}
