import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useState, useCallback } from "react";
import { getRemapItems, deleteRemap, RemapItem, RemapType } from "./lib/config";
import { restartService } from "./lib/service";
import { AddRemapForm } from "./add-remap";

const TYPE_ICONS: Record<RemapType, { icon: Icon; color: Color }> = {
  modifier_remap: { icon: Icon.Key, color: Color.Purple },
  remap: { icon: Icon.Switch, color: Color.Yellow },
  conditional_remap: { icon: Icon.ArrowRight, color: Color.Blue },
  tap_hold: { icon: Icon.Hourglass, color: Color.Orange },
  chord: { icon: Icon.Layers, color: Color.Green },
};

const TYPE_LABELS: Record<RemapType, string> = {
  modifier_remap: "Modifier Remaps",
  remap: "Key Swaps",
  conditional_remap: "Conditional Remaps",
  tap_hold: "Tap-Hold",
  chord: "Chords",
};

export default function ViewRemaps() {
  const [items, setItems] = useState<RemapItem[]>(() => {
    try {
      return getRemapItems();
    } catch {
      return [];
    }
  });

  const reload = useCallback(() => {
    try {
      setItems(getRemapItems());
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to read config",
        message: String(e),
      });
    }
  }, []);

  async function handleDelete(item: RemapItem) {
    const confirmed = await confirmAlert({
      title: "Delete Remap",
      message: `Delete "${item.title}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      deleteRemap(item.id);
      restartService();
      reload();
      await showToast({
        style: Toast.Style.Success,
        title: "Deleted",
        message: item.title,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: String(e),
      });
    }
  }

  async function handleRestart() {
    try {
      restartService();
      await showToast({
        style: Toast.Style.Success,
        title: "Switcheroo restarted",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to restart",
        message: String(e),
      });
    }
  }

  // Group items by type
  const grouped = new Map<RemapType, RemapItem[]>();
  for (const item of items) {
    const list = grouped.get(item.type) ?? [];
    list.push(item);
    grouped.set(item.type, list);
  }

  const sectionOrder: RemapType[] = [
    "modifier_remap",
    "remap",
    "tap_hold",
    "conditional_remap",
    "chord",
  ];

  return (
    <List searchBarPlaceholder="Search remaps...">
      {sectionOrder
        .filter((type) => grouped.has(type))
        .map((type) => (
          <List.Section key={type} title={TYPE_LABELS[type]}>
            {(grouped.get(type) ?? []).map((item) => (
              <List.Item
                key={item.id}
                icon={{
                  source: TYPE_ICONS[item.type].icon,
                  tintColor: TYPE_ICONS[item.type].color,
                }}
                title={item.title}
                subtitle={item.subtitle}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        icon={Icon.Pencil}
                        title="Edit Remap"
                        target={<AddRemapForm onAdd={reload} editItem={item} />}
                      />
                      <Action.Push
                        icon={Icon.Plus}
                        title="Add Remap"
                        shortcut={Keyboard.Shortcut.Common.New}
                        target={<AddRemapForm onAdd={reload} />}
                      />
                      <Action
                        icon={Icon.Trash}
                        title="Delete Remap"
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => handleDelete(item)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        icon={Icon.ArrowClockwise}
                        title="Restart Switcheroo"
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={handleRestart}
                      />
                      <Action.Open
                        icon={Icon.TextDocument}
                        title="Edit Config in Editor"
                        target={`~/.config/switcheroo/config.toml`}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
      {items.length === 0 && (
        <List.EmptyView
          icon={Icon.Keyboard}
          title="No Remaps Configured"
          description="Press ⌘N to add your first remap"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Remap"
                target={<AddRemapForm onAdd={reload} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
