import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { applyHotCornerSettings, type HotCornerPreset, loadPresets, movePreset, removePreset } from "./lib/hot-corners";
import { savePresetIntraExtensionLaunch } from "./lib/extension-identity";
import { TOGGLE_BACKUP_KEY, TOGGLE_DISABLED_KEY } from "./lib/toggle-storage";

export default function ListPresetsCommand() {
  const [presets, setPresets] = useState<HotCornerPreset[]>(() => loadPresets());
  const [search, setSearch] = useState("");
  const [selectionId, setSelectionId] = useState<string | null>(null);

  const indexById = useMemo(() => {
    const m = new Map<string, number>();
    presets.forEach((p, i) => m.set(p.id, i));
    return m;
  }, [presets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter((p) => p.name.toLowerCase().includes(q));
  }, [presets, search]);

  if (presets.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No presets yet"
          description="Run “Save Hot Corners Preset” to capture your current configuration."
          actions={
            <ActionPanel>
              <Action
                title="Save Hot Corners Preset"
                icon={Icon.Plus}
                onAction={() => launchCommand({ ...savePresetIntraExtensionLaunch })}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      filtering={false}
      searchBarPlaceholder="Search presets…"
      selectedItemId={selectionId ?? undefined}
      onSearchTextChange={setSearch}
      onSelectionChange={setSelectionId}
    >
      {filtered.map((preset) => {
        const index = indexById.get(preset.id) ?? -1;
        return (
          <List.Item
            id={preset.id}
            key={preset.id}
            title={preset.name}
            actions={
              <ActionPanel>
                <Action
                  title="Activate"
                  icon={Icon.Check}
                  onAction={async () => {
                    try {
                      applyHotCornerSettings(preset.settings);
                      await LocalStorage.removeItem(TOGGLE_DISABLED_KEY);
                      await LocalStorage.removeItem(TOGGLE_BACKUP_KEY);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Hot corners updated",
                        message: preset.name,
                      });
                    } catch (e) {
                      const message = e instanceof Error ? e.message : String(e);
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Could not apply preset",
                        message,
                      });
                    }
                  }}
                />
                {index > 0 ? (
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => setPresets(movePreset(preset.id, -1))}
                  />
                ) : null}
                {index >= 0 && index < presets.length - 1 ? (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => setPresets(movePreset(preset.id, 1))}
                  />
                ) : null}
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Delete preset?",
                      message: `“${preset.name}” will be removed.`,
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                      dismissAction: {
                        title: "Cancel",
                        style: Alert.ActionStyle.Cancel,
                      },
                    });
                    if (!confirmed) return;
                    const deletedId = preset.id;
                    const next = removePreset(deletedId);
                    setPresets(next);
                    setSelectionId((current) => (current !== deletedId ? current : (next[0]?.id ?? null)));
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Preset deleted",
                      message: preset.name,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
