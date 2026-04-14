import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ModelPresetForm } from "./components/model-preset-form";
import { ensureDefaults } from "./defaults";
import { deleteModelPreset, getModelPresets } from "./storage";
import type { ModelPreset } from "./types";

export default function ManageModelPresets() {
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPresets = useCallback(async () => {
    await ensureDefaults();
    const data = await getModelPresets();
    setPresets(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  async function handleDelete(preset: ModelPreset) {
    if (
      await confirmAlert({
        title: `Delete "${preset.name}"?`,
        message: "This cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await deleteModelPreset(preset.id);
      await showToast({ style: Toast.Style.Success, title: "Preset deleted" });
      await loadPresets();
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Model Presets">
      {presets.map((preset) => (
        <List.Item
          key={preset.id}
          title={preset.name}
          subtitle={`${preset.provider} / ${preset.model}`}
          accessories={[{ text: `temp: ${preset.temperature}` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                target={
                  <ModelPresetForm preset={preset} onSave={loadPresets} />
                }
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(preset)}
              />
              <Action.Push
                title="Create New"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<ModelPresetForm onSave={loadPresets} />}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title="Create New Preset"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create"
              target={<ModelPresetForm onSave={loadPresets} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
