import { ActionPanel, Action, List, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { getPresets, deletePreset, InitPreset } from "./utils/storage";
import { homedir } from "os";
import EditPresetForm from "./components/edit-preset-form";

export default function ManagePresets() {
  const [presets, setPresets] = useState<InitPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadPresets() {
    setIsLoading(true);
    try {
      const loadedPresets = await getPresets();
      setPresets(loadedPresets);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load presets",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPresets();
  }, []);

  async function handleDelete(preset: InitPreset) {
    if (
      await confirmAlert({
        title: "Confirm Deletion",
        message: `Are you sure you want to delete the preset "${preset.name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deletePreset(preset.name);
        await showToast({ style: Toast.Style.Success, title: "Preset deleted" });
        await loadPresets(); // 重新加载预设列表
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete preset",
          message: String(error),
        });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets...">
      {presets.length === 0 && !isLoading ? (
        <List.EmptyView title="No presets found" description="Add your first preset to get started" />
      ) : (
        presets.map((preset) => (
          <List.Item
            key={preset.name}
            title={preset.name}
            subtitle={preset.command || "No command"}
            accessories={[
              {
                text: preset.path[0].replace(/^~(?=$|\/|\\)/, homedir()),
                tooltip: "Path",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Edit Preset" target={<EditPresetForm preset={preset} onSave={loadPresets} />} />
                <Action title="Delete Preset" style={Action.Style.Destructive} onAction={() => handleDelete(preset)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
