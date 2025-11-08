import { List, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { PresetConfig } from "../../core/types";

interface PresetSelectorProps {
  presets: PresetConfig[];
  selectedPreset: PresetConfig | null;
  onSelectPreset: (preset: PresetConfig) => void;
  onCancel?: () => void;
  title?: string;
}

export function PresetSelector({
  presets,
  selectedPreset,
  onSelectPreset,
  onCancel,
  title = "Select Preset",
}: PresetSelectorProps) {
  const { pop } = useNavigation();
  const getPresetIcon = (preset: PresetConfig): Icon => {
    if (preset.isBuiltIn) {
      switch (preset.id) {
        case "general":
          return Icon.Document;
        case "images":
          return Icon.Image;
        case "code":
          return Icon.Code;
        default:
          return Icon.Gear;
      }
    }
    return Icon.Person; // Custom preset
  };

  const getPresetSubtitle = (preset: PresetConfig): string => {
    const parts = [];

    if (preset.isBuiltIn) {
      parts.push("Built-in");
    } else {
      parts.push("Custom");
      if (preset.updatedAt) {
        const date = new Date(preset.updatedAt);
        parts.push(`Updated ${date.toLocaleDateString()}`);
      }
    }

    if (preset.tags?.length > 0) {
      parts.push(preset.tags.slice(0, 2).join(", "));
    }

    return parts.join(" • ");
  };

  // Group presets by type
  const builtInPresets = presets.filter((p) => p.isBuiltIn);
  const customPresets = presets.filter((p) => !p.isBuiltIn);

  return (
    <List searchBarPlaceholder="Search presets..." navigationTitle={title}>
      {builtInPresets.length > 0 && (
        <List.Section title="Built-in Presets">
          {builtInPresets.map((preset) => (
            <List.Item
              key={preset.id}
              icon={getPresetIcon(preset)}
              title={preset.name}
              subtitle={getPresetSubtitle(preset)}
              accessories={selectedPreset?.id === preset.id ? [{ icon: Icon.Check }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title="Select This Preset"
                    icon={Icon.Check}
                    onAction={() => {
                      onSelectPreset(preset);
                      pop();
                    }}
                  />
                  {onCancel && (
                    <Action
                      title="Cancel"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={() => {
                        onCancel();
                        pop();
                      }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {customPresets.length > 0 && (
        <List.Section title="Custom Presets">
          {customPresets.map((preset) => (
            <List.Item
              key={preset.id}
              icon={getPresetIcon(preset)}
              title={preset.name}
              subtitle={getPresetSubtitle(preset)}
              accessories={selectedPreset?.id === preset.id ? [{ icon: Icon.Check }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title="Select This Preset"
                    icon={Icon.Check}
                    onAction={() => {
                      onSelectPreset(preset);
                      pop();
                    }}
                  />
                  {onCancel && (
                    <Action
                      title="Cancel"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={() => {
                        onCancel();
                        pop();
                      }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {presets.length === 0 && (
        <List.EmptyView
          icon={Icon.Document}
          title="No Presets Available"
          description="Create custom presets or check your settings"
        />
      )}
    </List>
  );
}
