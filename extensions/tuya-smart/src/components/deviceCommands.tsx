import type { JSX } from "react";
import { Color, Icon, List } from "@raycast/api";
import { Device } from "../utils/interfaces";
import { CommandActionPanel } from "./actionPanels";
import {
  actionableStatuses,
  applyCommandResult,
  formatStatusValue,
  statusLabel,
  cleanName,
  temperatureUnitOf,
} from "../utils/deviceSemantics";

export function DeviceCommands(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const device = props.device;
  const unit = temperatureUnitOf(device);
  const commands = actionableStatuses(device);

  return (
    <List navigationTitle={cleanName(device.name)} searchBarPlaceholder="Search controls by name">
      <List.Section title="Controls" subtitle={String(commands.length)}>
        {commands.map((command) => (
          <List.Item
            key={command.code}
            title={statusLabel(command)}
            accessories={[{ text: formatStatusValue(command, unit) }]}
            icon={{
              source: typeof command.value === "boolean" && command.value ? Icon.CircleFilled : Icon.Circle,
              tintColor: command.value ? Color.Green : Color.Red,
            }}
            actions={
              <CommandActionPanel
                command={command}
                device={device}
                onAction={(outcome) => props.onAction(applyCommandResult(device, outcome))}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
