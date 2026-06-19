import { useEffect, useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getAllPresets, deleteUserPreset, duplicatePreset } from "./utils/presets";
import { Preset } from "./types/media";
import { PresetEditorForm } from "./components/PresetEditorForm";

export default function Command() {
  const [presets, setPresets] = useState<Preset[] | null>(null);

  const reload = async () => {
    try {
      const all = await getAllPresets();
      setPresets(all);
    } catch (error) {
      showFailureToast(error, { title: "Failed to load presets" });
      setPresets([]);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  if (presets === null) return <List isLoading={true} />;

  const builtIns = presets.filter((p) => p.builtIn);
  const userPresets = presets.filter((p) => !p.builtIn);

  return (
    <List
      searchBarPlaceholder="Search presets"
      actions={
        <ActionPanel>
          <CreatePresetAction onChange={reload} />
        </ActionPanel>
      }
    >
      {builtIns.length > 0 && (
        <List.Section title="Built-in">
          {builtIns.map((p) => (
            <PresetItem key={p.id} preset={p} onChange={reload} />
          ))}
        </List.Section>
      )}
      <List.Section title="My Presets">
        {userPresets.length === 0 ? (
          <List.Item
            title="No user presets yet"
            subtitle="Save current form settings via 'Save Settings as Preset…' in the Convert Media form, or use the action below."
            icon={Icon.Stars}
            actions={
              <ActionPanel>
                <CreatePresetAction onChange={reload} />
              </ActionPanel>
            }
          />
        ) : (
          userPresets.map((p) => <PresetItem key={p.id} preset={p} onChange={reload} />)
        )}
      </List.Section>
    </List>
  );
}

function PresetItem({ preset, onChange }: { preset: Preset; onChange: () => Promise<void> }) {
  const subtitle = preset.description ?? describePreset(preset);
  const accessories: List.Item.Accessory[] = [
    { tag: { value: preset.outputFormat, color: Color.Blue } },
    { text: preset.mediaType },
  ];
  if (preset.stripMetadata) accessories.push({ icon: Icon.EyeDisabled, tooltip: "Strips metadata" });
  if (preset.trim) accessories.push({ icon: Icon.FilmStrip, tooltip: "Includes trim settings" });

  return (
    <List.Item
      title={preset.name}
      subtitle={subtitle}
      icon={preset.builtIn ? Icon.Star : Icon.StarCircle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {!preset.builtIn && <EditPresetAction preset={preset} onChange={onChange} />}
            <Action
              title="Duplicate to My Presets"
              icon={Icon.Duplicate}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                try {
                  await duplicatePreset(preset.id);
                  await onChange();
                  await showToast({ style: Toast.Style.Success, title: "Preset duplicated" });
                } catch (error) {
                  showFailureToast(error, { title: "Failed to duplicate preset" });
                }
              }}
            />
          </ActionPanel.Section>
          {!preset.builtIn && (
            <ActionPanel.Section>
              <Action
                title="Delete Preset"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: `Delete "${preset.name}"?`,
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    await deleteUserPreset(preset.id);
                    await onChange();
                  }
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <CreatePresetAction onChange={onChange} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CreatePresetAction({ onChange }: { onChange: () => Promise<void> }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Create New Preset…"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => push(<PresetEditorForm mode="create" onSaved={onChange} />)}
    />
  );
}

function EditPresetAction({ preset, onChange }: { preset: Preset; onChange: () => Promise<void> }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Edit Preset…"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() => push(<PresetEditorForm mode="edit" preset={preset} onSaved={onChange} />)}
    />
  );
}

function describePreset(p: Preset): string {
  const parts: string[] = [p.outputFormat];
  const q = (p.quality as Record<string, unknown>)[p.outputFormat];
  if (typeof q === "number") parts.push(`quality ${q}`);
  else if (typeof q === "string") parts.push(q);
  else if (q && typeof q === "object") {
    const obj = q as Record<string, unknown>;
    if (obj.bitrate) parts.push(`${obj.bitrate}kbps`);
    if (obj.crf !== undefined) parts.push(`CRF ${obj.crf}`);
    if (obj.variant) parts.push(`ProRes ${obj.variant}`);
    if (obj.fps) parts.push(`${obj.fps}fps`);
  }
  if (p.stripMetadata) parts.push("strip metadata");
  return parts.join(" · ");
}
