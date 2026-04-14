import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ensureDefaults } from "../defaults";
import { getModelPresets } from "../storage";
import type { ModelPreset } from "../types";
import { PROVIDER_LABELS } from "../types";

interface ModelPresetPickerProps {
  onSelect: (preset: ModelPreset) => void;
}

export function ModelPresetPicker({ onSelect }: ModelPresetPickerProps) {
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

  return (
    <List isLoading={isLoading} navigationTitle="Select Model Preset">
      {presets.map((preset) => (
        <List.Item
          key={preset.id}
          title={preset.name}
          subtitle={`${PROVIDER_LABELS[preset.provider]} / ${preset.model}`}
          accessories={[{ text: `temp: ${preset.temperature}` }]}
          icon={Icon.ComputerChip}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                icon={Icon.Check}
                onAction={() => onSelect(preset)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
