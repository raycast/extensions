import { ActionPanel, Action, List, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { getPresets, deletePreset, InitPreset } from "./utils/storage";
import { useTranslation } from "./utils/i18n";
import { homedir } from "os";
import EditPresetForm from "./components/edit-preset-form";

export default function ManagePresets() {
  const { t } = useTranslation();
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
        title: t.preset.loadFailed,
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
        title: t.preset.confirmDelete,
        message: t.preset.deleteMessage.replace("{name}", preset.name),
        primaryAction: {
          title: t.common.delete,
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deletePreset(preset.name);
        await showToast({ style: Toast.Style.Success, title: t.preset.deleted });
        await loadPresets(); // 重新加载预设列表
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: t.preset.deleteFailed,
          message: String(error),
        });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={t.preset.searchPlaceholder}>
      {presets.length === 0 && !isLoading ? (
        <List.EmptyView title={t.preset.noPresets} description={t.preset.addFirst} />
      ) : (
        presets.map((preset) => (
          <List.Item
            key={preset.name}
            title={preset.name}
            subtitle={preset.command || t.preset.noCommand}
            accessories={[
              {
                text: preset.path[0].replace(/^~(?=$|\/|\\)/, homedir()),
                tooltip: t.common.path,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title={t.preset.edit} target={<EditPresetForm preset={preset} onSave={loadPresets} />} />
                <Action
                  title={t.preset.delete}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(preset)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
