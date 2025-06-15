import { ActionPanel, Action, Icon, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import {
  disableBrightnessPreset,
  enableBrightnessPreset,
  getEnabledBrightnessPresets,
  SUPPORTED_BRIGHTNESS_PRESETS,
} from "./brightness-presets";

interface BrightnessPresetOption {
  value: number;
  isEnabled: boolean;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [brightnessPresets, setBrightnessPresets] = useState<BrightnessPresetOption[]>([]);

  const refreshBrightnessPresets = async (): Promise<void> => {
    const enabledBrightnessPresets = await getEnabledBrightnessPresets();
    const brightnessPresets = SUPPORTED_BRIGHTNESS_PRESETS.map((brightnessPreset) => ({
      value: brightnessPreset,
      isEnabled: enabledBrightnessPresets.has(brightnessPreset),
    }));
    setBrightnessPresets(brightnessPresets);
    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      refreshBrightnessPresets();
    })();
  }, []);

  return (
    <List isLoading={isLoading}>
      {brightnessPresets.map((brightnessPreset) => (
        <List.Item
          key={brightnessPreset.value}
          title={`${brightnessPreset.value}%`}
          icon={brightnessPreset.isEnabled ? Icon.Checkmark : Icon.EyeDisabled}
          actions={
            <ActionPanel>
              {brightnessPreset.isEnabled && (
                <Action
                  title="Disable"
                  icon={Icon.EyeDisabled}
                  onAction={async () => {
                    await disableBrightnessPreset(brightnessPreset.value);
                    await refreshBrightnessPresets();
                  }}
                />
              )}
              {!brightnessPreset.isEnabled && (
                <Action
                  title="Enable"
                  icon={Icon.Checkmark}
                  onAction={async () => {
                    await enableBrightnessPreset(brightnessPreset.value);
                    await refreshBrightnessPresets();
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
