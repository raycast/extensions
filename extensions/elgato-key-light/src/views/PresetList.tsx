import { List, ActionPanel, Action, showToast, Toast, Icon, confirmAlert, Keyboard, environment } from "@raycast/api";
import { Preset, deletePreset, usePresets } from "../presets";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { convertFormTemperatureToActual, KeyLight } from "../elgato";
import PresetForm, { FormValues } from "./PresetForm";
import { randomUUID } from "crypto";
import { discoverKeyLights } from "../utils";
import { showFailureToast } from "@raycast/utils";

export default function PresetList() {
  const { value: presets, isLoading, setValue: setPresets, removeValue } = usePresets();

  async function handleActivate(preset: Preset) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Activating "${preset.name}" preset`,
      });

      const keyLight = await discoverKeyLights();

      // First turn on the lights to ensure they are responsive
      try {
        await keyLight.turnOn();
      } catch (error) {
        // If turning on fails, try force discovery again
        if (environment.isDevelopment) {
          console.error("Failed to turn on Key Light, forcing fresh discovery and retrying");
        }
        try {
          const keyLightRetry = await discoverKeyLights(true);
          await keyLightRetry.turnOn();
        } catch (retryError) {
          throw new Error(`Failed to turn on Key Light after retry: ${(retryError as Error).message}`);
        }
      }

      // Now apply the preset settings
      await keyLight.update({
        brightness: preset.settings.brightness,
        temperature: preset.settings.temperature
          ? convertFormTemperatureToActual(preset.settings.temperature)
          : undefined,
      });

      await showToast({
        style: Toast.Style.Success,
        title: `Activated "${preset.name}" preset`,
      });
    } catch (error) {
      showFailureToast(error, { title: `Failed to activate preset "${preset.name}"` });
    }
  }

  async function handleSave(values: FormValues & { id?: string }) {
    const preset: Preset = {
      id: values.id ?? randomUUID(),
      name: values.name,
      icon: values.icon,
      settings: {
        brightness: parseInt(values.brightness),
        temperature: parseInt(values.temperature),
      },
    };
    await setPresets([...(presets ?? []).filter((p: Preset) => p.id !== preset.id), preset]);
  }

  async function handleDelete(preset: Preset) {
    try {
      const confirmed = await confirmAlert({ title: "Do you want to delete the preset?" });
      if (!confirmed) {
        return;
      }

      await deletePreset(preset.id);
      await removeValue();
      await showToast({
        style: Toast.Style.Success,
        title: `Deleted "${preset.name}" preset`,
      });
    } catch (error) {
      showFailureToast(error, { title: `Failed to delete preset "${preset.name}"` });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets...">
      {presets?.map((preset) => (
        <List.Item
          key={preset.id}
          icon={preset.icon ?? Icon.Circle}
          title={preset.name}
          accessories={[
            {
              icon: Icon.LightBulb,
              text: preset.settings.brightness ? `${preset.settings.brightness}%` : undefined,
              tooltip: "Brightness",
            },
            {
              icon: Icon.Temperature,
              text: preset.settings.temperature ? `${preset.settings.temperature}%` : undefined,
              tooltip: "Temperature",
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Activate Preset" icon={Icon.LightBulb} onAction={() => handleActivate(preset)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Create Preset"
                  icon={Icon.NewDocument}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<PresetForm onSave={handleSave} />}
                />
                <Action.Push
                  title="Edit Preset"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<PresetForm onSave={handleSave} preset={preset} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDelete(preset)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
