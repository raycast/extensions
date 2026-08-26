import type { JSX } from "react";
import { Color, Icon, List } from "@raycast/api";
import { Device, FunctionItem } from "../utils/interfaces";
import { CommandActionPanel, withUpdatedStatus } from "./actionPanels";
import { formatStatusValue, isNoiseStatus, statusLabel, cleanName, temperatureUnitOf } from "../utils/deviceSemantics";

/** Data points a user can act on: booleans to flip, numbers to set, enums to choose. */
function actionableStatuses(device: Device): FunctionItem[] {
  return (device.status ?? []).filter(
    (status) => !isNoiseStatus(status) && (typeof status.value === "boolean" || typeof status.value === "number"),
  );
}

export function DeviceCommands(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const device = props.device;
  const unit = temperatureUnitOf(device);
  const commands = actionableStatuses(device);

  return (
    <List navigationTitle={cleanName(device.name)} searchBarPlaceholder="Search switches by name">
      <List.Section title="Switches" subtitle={String(commands.length)}>
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
                onAction={({ command: updated }) => props.onAction(withUpdatedStatus(device, updated))}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
