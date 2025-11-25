import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { MonitorControl } from "./utils/monitor-control";
import { useState, useEffect } from "react";

interface BrightnessPreset {
  name: string;
  value: number;
  icon: string;
  description: string;
}

const presets: BrightnessPreset[] = [
  { name: "Low Light", value: 25, icon: "🌙", description: "Perfect for dark environments" },
  { name: "Medium", value: 50, icon: "🌤️", description: "Balanced brightness for normal use" },
  { name: "High", value: 75, icon: "☀️", description: "Bright setting for well-lit rooms" },
  { name: "Maximum", value: 100, icon: "🔆", description: "Full brightness for outdoor use" },
];

export default function BrightnessPresets() {
  const [currentBrightness, setCurrentBrightness] = useState<number>(75);

  useEffect(() => {
    MonitorControl.getCurrentBrightness().then(setCurrentBrightness);
  }, []);

  const handlePresetSelect = async (preset: BrightnessPreset) => {
    const hasSupport = await MonitorControl.checkDDCSupport();
    if (!hasSupport) return;

    await MonitorControl.setBrightness(preset.value);
    setCurrentBrightness(preset.value);
  };

  return (
    <List>
      {presets.map((preset) => (
        <List.Item
          key={preset.value}
          title={preset.name}
          subtitle={`${preset.value}%`}
          accessories={[
            { text: preset.description },
            currentBrightness === preset.value ? { icon: Icon.Checkmark } : {},
          ]}
          icon={preset.icon}
          actions={
            <ActionPanel>
              <Action title={`Set Brightness to ${preset.value}%`} onAction={() => handlePresetSelect(preset)} />
            </ActionPanel>
          }
        />
      ))}

      <List.Section title="Contrast">
        <List.Item
          title="Low Contrast"
          subtitle="50%"
          icon="🔅"
          actions={
            <ActionPanel>
              <Action
                title="Set Contrast to 50%"
                onAction={async () => {
                  const hasSupport = await MonitorControl.checkDDCSupport();
                  if (hasSupport) {
                    await MonitorControl.setContrast(50);
                  }
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Medium Contrast"
          subtitle="75%"
          icon="📺"
          actions={
            <ActionPanel>
              <Action
                title="Set Contrast to 75%"
                onAction={async () => {
                  const hasSupport = await MonitorControl.checkDDCSupport();
                  if (hasSupport) {
                    await MonitorControl.setContrast(75);
                  }
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="High Contrast"
          subtitle="100%"
          icon="🔆"
          actions={
            <ActionPanel>
              <Action
                title="Set Contrast to 100%"
                onAction={async () => {
                  const hasSupport = await MonitorControl.checkDDCSupport();
                  if (hasSupport) {
                    await MonitorControl.setContrast(100);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Color Channels">
        <List.Item
          title="Reset All Colors"
          subtitle="Restore RGB to 100%"
          icon="🎨"
          actions={
            <ActionPanel>
              <Action
                title="Reset All Colors"
                onAction={async () => {
                  const hasSupport = await MonitorControl.checkDDCSupport();
                  if (hasSupport) {
                    await MonitorControl.resetColors();
                  }
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Warm Colors"
          subtitle="Reduce blue to 70%"
          icon="🌅"
          actions={
            <ActionPanel>
              <Action
                title="Apply Warm Colors"
                onAction={async () => {
                  const hasSupport = await MonitorControl.checkDDCSupport();
                  if (hasSupport) {
                    await MonitorControl.toggleEyeCare();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
