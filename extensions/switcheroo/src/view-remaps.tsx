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
import { useState, useCallback, useEffect } from "react";
import {
  loadSnapshot,
  deleteRemap,
  RemapItem,
  RemapType,
  ConfigSnapshot,
} from "./lib/config";
import { restartService } from "./lib/service";
import { AddRemapForm } from "./add-remap";

const TYPE_ICONS: Record<RemapType, { icon: Icon; color: Color }> = {
  modifier_remap: { icon: Icon.CommandSymbol, color: Color.Purple },
  remap: { icon: Icon.Switch, color: Color.Yellow },
  conditional_remap: { icon: Icon.ArrowRight, color: Color.Blue },
  tap_hold: { icon: Icon.Clock, color: Color.Orange },
  chord: { icon: Icon.Keyboard, color: Color.Green },
};

const TYPE_LABELS: Record<RemapType, string> = {
  modifier_remap: "Modifier Remaps",
  remap: "Key Swaps",
  conditional_remap: "Conditional Remaps",
  tap_hold: "Tap-Hold",
  chord: "Chords",
};

export default function ViewRemaps() {
  // ── F4: distinguish load errors from empty config ──────────────────
  // snapshot holds items + revision for stale-change detection on delete.
  const [snapshot, setSnapshot] = useState<ConfigSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    try {
      const snap = loadSnapshot();
      setSnapshot(snap);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSnapshot(null);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to read config",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const items = snapshot?.items ?? null;

  async function handleDelete(item: RemapItem) {
    const confirmed = await confirmAlert({
      title: "Delete Remap",
      message: `Delete "${item.title}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    // ── F1: separate delete write from restart ────────────────────────
    // Pass captured document revision + entry fingerprint for stale detection.
    // The atomic writer verifies the file hasn't changed since display time.
    try {
      deleteRemap(
        item.id,
        snapshot?.revision ?? "",
        item.fingerprint,
        snapshot?.target ?? null,
      );
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
        message: e instanceof Error ? e.message : String(e),
      });
      return;
    }

    // Second try/catch: restart only. Non-fatal.
    try {
      const result = restartService();
      await showToast({
        style: Toast.Style.Success,
        title: result.message,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Deleted, but restart failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function handleRestart() {
    try {
      const result = restartService();
      await showToast({
        style: Toast.Style.Success,
        title: result.message,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to restart",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Group items by type
  const grouped = new Map<RemapType, RemapItem[]>();
  if (items) {
    for (const item of items) {
      const list = grouped.get(item.type) ?? [];
      list.push(item);
      grouped.set(item.type, list);
    }
  }

  const sectionOrder: RemapType[] = [
    "modifier_remap",
    "remap",
    "tap_hold",
    "conditional_remap",
    "chord",
  ];

  return (
    <List
      isLoading={snapshot === null && error === null}
      searchBarPlaceholder="Search remaps..."
    >
      {error !== null ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Config"
          description={error}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                title="Reload Config"
                onAction={reload}
              />
              <Action.Open
                icon={Icon.TextDocument}
                title="Edit Config in Editor"
                target={`~/.config/switcheroo/config.toml`}
              />
            </ActionPanel>
          }
        />
      ) : (
        sectionOrder
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
                          target={
                            <AddRemapForm
                              onAdd={reload}
                              editItem={item}
                              documentRevision={snapshot?.revision ?? ""}
                              editFingerprint={item.fingerprint}
                              targetIdentity={snapshot?.target ?? null}
                            />
                          }
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
          ))
      )}
      {error === null && items !== null && items.length === 0 && (
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
