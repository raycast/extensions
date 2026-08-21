import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  environment,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { AI_SERVICES } from "./lib/prompt-urls.js";
import { deletePreset, loadPresets } from "./lib/preset-storage.js";
import {
  buildPresetDeeplink,
  extractTemplateArguments,
  type PromptPreset,
} from "./lib/presets.js";
import { PresetConfigForm } from "./preset-config-form.js";
import { RunPresetAction } from "./preset-command.js";

export default function ManagePresetsCommand() {
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      try {
        setPresets(await loadPresets());
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load presets",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    void initialize();
  }, []);

  function updatePreset(preset: PromptPreset) {
    setPresets((current) => {
      const index = current.findIndex(
        (candidate) => candidate.id === preset.id,
      );
      if (index === -1) return [...current, preset];
      return current.map((candidate) =>
        candidate.id === preset.id ? preset : candidate,
      );
    });
  }

  async function removePreset(preset: PromptPreset) {
    const confirmed = await confirmAlert({
      title: `Delete “${preset.name}”?`,
      message: "Any Quicklink for this preset will stop finding it.",
      primaryAction: {
        title: "Delete Preset",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      await deletePreset(preset.id);
      setPresets((current) =>
        current.filter((candidate) => candidate.id !== preset.id),
      );
      await showToast({
        style: Toast.Style.Success,
        title: `Deleted ${preset.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete preset",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets…">
      <List.EmptyView
        icon={Icon.Stars}
        title="No Presets Yet"
        description="Create a reusable prompt template and choose where it opens."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Preset"
              icon={Icon.Plus}
              target={<PresetConfigForm onSave={updatePreset} />}
            />
          </ActionPanel>
        }
      />
      {presets.map((preset) => (
        <List.Item
          key={preset.id}
          icon={Icon.Stars}
          title={preset.name}
          subtitle={describePreset(preset)}
          actions={
            <ActionPanel>
              <RunPresetAction preset={preset} onPresetChange={updatePreset} />
              <Action.Push
                title="Edit Preset"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <PresetConfigForm preset={preset} onSave={updatePreset} />
                }
              />
              <Action.CreateQuicklink
                title="Create Quicklink for Preset"
                icon={Icon.Link}
                quicklink={{
                  name: preset.name,
                  link: buildPresetDeeplink(
                    environment.ownerOrAuthorName,
                    environment.extensionName,
                    preset.id,
                  ),
                }}
              />
              <Action.Push
                title="Create Preset"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<PresetConfigForm onSave={updatePreset} />}
              />
              <Action
                title="Delete Preset"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => removePreset(preset)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function describePreset(preset: PromptPreset): string {
  const argumentCount = extractTemplateArguments(preset.template).length;
  const destinations = AI_SERVICES.filter(
    (service) => preset.serviceCounts[service.id] > 0,
  )
    .map((service) => {
      const count = preset.serviceCounts[service.id];
      return count === 1 ? service.name : `${service.name} ×${count}`;
    })
    .join(", ");
  return `${argumentCount} argument${argumentCount === 1 ? "" : "s"} · ${destinations}`;
}
