import { List, showToast, Toast, Action, ActionPanel } from "@raycast/api";
import { execSync } from "child_process";
import React from "react";

interface AudioDevice {
  name: string;
  type: "Input" | "Output";
  isActive: boolean;
}

function executeCommand(command: string): string {
  return execSync(`/opt/homebrew/bin/SwitchAudioSource ${command}`).toString().trim();
}

function getCurrentDevices(): { currentInput: string; currentOutput: string } {
  return {
    currentInput: executeCommand("-c -t input"),
    currentOutput: executeCommand("-c -t output"),
  };
}

function parseDevices(deviceType: "Input" | "Output", currentDevice: string): AudioDevice[] {
  return executeCommand(`-a -t ${deviceType.toLowerCase()} -f json`)
    .split("\n")
    .reduce((acc, line) => {
      try {
        const device = JSON.parse(line);
        acc.push({
          name: device.name,
          type: deviceType,
          isActive: device.name === currentDevice,
        });
      } catch (error) {
        // Skip invalid JSON lines
      }
      return acc;
    }, [] as AudioDevice[]);
}

function getSoundSources(): AudioDevice[] {
  try {
    const { currentInput, currentOutput } = getCurrentDevices();
    const inputDevices = parseDevices("Input", currentInput);
    const outputDevices = parseDevices("Output", currentOutput);
    return [...inputDevices, ...outputDevices];
  } catch (error) {
    console.error("Error fetching sound sources:", error);
    return [];
  }
}

async function switchAudioSource(device: AudioDevice) {
  try {
    executeCommand(`-s "${device.name}" -t ${device.type.toLowerCase()}`);
    await showToast({
      style: Toast.Style.Success,
      title: "Audio Source Changed",
      message: `Switched to ${device.name}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to switch audio source",
    });
  }
}

function DeviceListItem({ source, onSwitch }: { source: AudioDevice; onSwitch: () => void }) {
  const icon = source.type === "Input" ? (source.isActive ? "🎤" : "🎙️") : source.isActive ? "🔊" : "🔈";
  return (
    <List.Item
      key={`${source.name}-${source.type}`}
      title={source.name}
      icon={icon}
      accessories={[{ text: source.isActive ? "Active" : "" }]}
      actions={
        <ActionPanel>
          <Action title={`Switch to This ${source.type}`} onAction={onSwitch} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [soundSources, setSoundSources] = React.useState<AudioDevice[]>([]);

  React.useEffect(() => {
    setSoundSources(getSoundSources());
  }, []);

  const handleSwitchAudioSource = async (device: AudioDevice) => {
    await switchAudioSource(device);
    setSoundSources(getSoundSources());
  };

  const inputs = soundSources
    .filter((source) => source.type === "Input")
    .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));
  const outputs = soundSources
    .filter((source) => source.type === "Output")
    .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));

  return (
    <List>
      <List.Section title="Output Devices">
        {outputs.map((source) => (
          <DeviceListItem
            key={`${source.name}-${source.type}`}
            source={source}
            onSwitch={() => handleSwitchAudioSource(source)}
          />
        ))}
      </List.Section>

      <List.Section title="Input Devices">
        {inputs.map((source) => (
          <DeviceListItem
            key={`${source.name}-${source.type}`}
            source={source}
            onSwitch={() => handleSwitchAudioSource(source)}
          />
        ))}
      </List.Section>
    </List>
  );
}
