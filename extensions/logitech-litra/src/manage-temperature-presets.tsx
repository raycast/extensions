import { ActionPanel, Action, Icon, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import {
  disableTemperaturePreset,
  enableTemperaturePreset,
  getEnabledTemperaturePresets,
  SUPPORTED_TEMPERATURE_PRESETS,
} from "./temperature-presets";

interface TemperaturePresetOption {
  value: number;
  isEnabled: boolean;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [temperaturePresets, setTemperaturePresets] = useState<TemperaturePresetOption[]>([]);

  const refreshTemperaturePresets = async (): Promise<void> => {
    const enabledTemperaturePresets = await getEnabledTemperaturePresets();
    const temperaturePresets = SUPPORTED_TEMPERATURE_PRESETS.map((temperaturePreset) => ({
      value: temperaturePreset,
      isEnabled: enabledTemperaturePresets.has(temperaturePreset),
    }));
    setTemperaturePresets(temperaturePresets);
    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      refreshTemperaturePresets();
    })();
  }, []);

  return (
    <List isLoading={isLoading}>
      {temperaturePresets.map((temperaturePreset) => (
        <List.Item
          key={temperaturePreset.value}
          title={`${temperaturePreset.value}K`}
          icon={temperaturePreset.isEnabled ? Icon.Checkmark : Icon.EyeDisabled}
          actions={
            <ActionPanel>
              {temperaturePreset.isEnabled && (
                <Action
                  title="Disable"
                  icon={Icon.EyeDisabled}
                  onAction={async () => {
                    await disableTemperaturePreset(temperaturePreset.value);
                    await refreshTemperaturePresets();
                  }}
                />
              )}
              {!temperaturePreset.isEnabled && (
                <Action
                  title="Enable"
                  icon={Icon.Checkmark}
                  onAction={async () => {
                    await enableTemperaturePreset(temperaturePreset.value);
                    await refreshTemperaturePresets();
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
