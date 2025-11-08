import { List, ActionPanel, Action, showToast, Toast, Icon, Clipboard, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { PresetConfig } from "../core/types";
import { PresetManager } from "../core/presets";
import { StorageManager } from "../core/storage";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "../core/constants";
import { generateId } from "../utils/helpers";
import { PresetEditor } from "../ui/components/PresetEditor";
import { PresetImport } from "../ui/components/PresetImport";
import { useClipboard, useProvider } from "../ui";

export default function ManagePresets() {
  const [presets, setPresets] = useState<PresetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();

  const { clipboardText, error: clipboardError } = useClipboard();
  const { provider, isProviderReady, providerError } = useProvider();

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const allPresets = await PresetManager.getAllPresets();
      setPresets(allPresets);
    } catch {
      showToast(Toast.Style.Failure, ERROR_MESSAGES.STORAGE_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (preset: PresetConfig) => {
    if (preset.isBuiltIn) {
      showToast(Toast.Style.Failure, "Cannot delete built-in presets");
      return;
    }

    try {
      await StorageManager.deleteCustomPreset(preset.id);
      showToast(Toast.Style.Success, SUCCESS_MESSAGES.PRESET_DELETED);
      await loadPresets();
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to delete preset: ${error}`);
    }
  };

  const handleExport = async (preset: PresetConfig) => {
    try {
      let json: string;

      if (preset.isBuiltIn) {
        const cleanPreset = {
          ...preset,
          id: "",
          isBuiltIn: false,
        };
        json = JSON.stringify(cleanPreset, null, 2);
      } else {
        json = await StorageManager.exportCustomPreset(preset.id);
      }

      await Clipboard.copy(json);
      showToast(Toast.Style.Success, "Preset exported to clipboard");
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to export preset: ${error}`);
    }
  };

  const handleDuplicate = async (preset: PresetConfig) => {
    try {
      const duplicated: PresetConfig = {
        ...preset,
        id: generateId("preset"),
        name: `${preset.name} (Copy)`,
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await StorageManager.saveCustomPreset(duplicated);
      showToast(Toast.Style.Success, "Preset duplicated");
      await loadPresets();
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to duplicate preset: ${error}`);
    }
  };

  const handleUse = async (preset: PresetConfig) => {
    try {
      // Check if we have clipboard text
      if (!clipboardText || clipboardText.trim().length === 0) {
        showToast(Toast.Style.Failure, "No text in clipboard", "Copy some text first, then use this preset");
        return;
      }

      if (!provider || !isProviderReady) {
        showToast(Toast.Style.Failure, "AI provider not available", "Please check your provider settings");
        return;
      }

      if (clipboardError || providerError) {
        showToast(Toast.Style.Failure, "Error detected", clipboardError || providerError || "Unknown error");
        return;
      }

      const validation = PresetManager.validatePrompt(clipboardText);
      if (!validation.isValid) {
        showToast(Toast.Style.Failure, "Invalid input", validation.error);
        return;
      }

      showToast(Toast.Style.Animated, "Enhancing...", `Using preset "${preset.name}"`);

      const renderedPrompt = PresetManager.renderPreset(preset, {
        input: clipboardText,
        style: "professional",
        format: "clear and concise",
      });

      const enhancedPrompt = await provider.enhance(clipboardText, {
        ...preset,
        systemPrompt: renderedPrompt,
      });

      await Clipboard.copy(enhancedPrompt);

      await showToast({
        style: Toast.Style.Success,
        title: "Enhancement Complete",
        message: `Enhanced with "${preset.name}" and copied to clipboard`,
      });
    } catch (error) {
      showToast(Toast.Style.Failure, "Enhancement failed", `${error}`);
    }
  };

  const handleExportAll = async () => {
    try {
      const customPresets = presets.filter((p) => !p.isBuiltIn);

      if (customPresets.length === 0) {
        showToast(Toast.Style.Failure, "No custom presets to export");
        return;
      }

      const json = await StorageManager.exportAllCustomPresets();
      await Clipboard.copy(json);
      showToast(Toast.Style.Success, `Exported ${customPresets.length} custom presets to clipboard`);
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to export all presets: ${error}`);
    }
  };

  const getPresetIcon = (preset: PresetConfig): Icon => {
    if (preset.isBuiltIn) {
      if (preset.id === "general") return Icon.Document;
      if (preset.id === "images") return Icon.Image;
      if (preset.id === "code") return Icon.Code;
      return Icon.Gear;
    }
    return Icon.Person;
  };

  const getPresetAccessory = (preset: PresetConfig) => {
    const tags = [];
    if (preset.isBuiltIn) tags.push("Built-in");
    if (preset.tags?.length > 0) tags.push(...preset.tags.slice(0, 2));
    return tags.join(" • ");
  };

  return (
    <List isLoading={loading} searchBarPlaceholder="Search presets...">
      <List.Section title={`${presets.length} Presets`}>
        {presets.map((preset) => (
          <List.Item
            key={preset.id}
            icon={getPresetIcon(preset)}
            title={preset.name}
            subtitle={`${preset.description} • ${getPresetAccessory(preset)}`}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Use Preset">
                  <Action title="Enhance with This Preset" icon={Icon.Play} onAction={() => handleUse(preset)} />
                </ActionPanel.Section>

                <ActionPanel.Section title="Manage">
                  <Action
                    title="Duplicate"
                    icon={Icon.Duplicate}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleDuplicate(preset)}
                  />
                  <Action
                    title="Export as JSON"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => handleExport(preset)}
                  />
                  {!preset.isBuiltIn && (
                    <>
                      <Action
                        title="Edit"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                        onAction={() => {
                          push(<PresetEditor preset={preset} onSave={() => loadPresets()} />);
                        }}
                      />
                      <Action
                        title="Delete"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => handleDelete(preset)}
                      />
                    </>
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section title="Create">
                  <Action
                    title="Create New Preset"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => {
                      push(<PresetEditor onSave={() => loadPresets()} />);
                    }}
                  />
                  <Action
                    title="Import from JSON"
                    icon={Icon.Upload}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={() => {
                      push(<PresetImport onImport={() => loadPresets()} />);
                    }}
                  />
                  <Action
                    title="Export All Custom Presets"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    onAction={handleExportAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
