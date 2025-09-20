import { Action, ActionPanel, Icon } from "@raycast/api";
import { Device, FunctionItem } from "../utils/interfaces";

import { DeviceCommands } from "./deviceCommands";

import * as Actions from "./actions";
import RenameFunctionForm from "./renameFunction";

export function DeviceActionPanel(props: {
  device: Device;
  showDetails: boolean;
  onAction: (device: Device) => void;
}): JSX.Element {
  const device = props.device;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {props.showDetails && (
          <Action.Push
            title="Show Details"
            icon={Icon.Document}
            target={<DeviceCommands device={device} onAction={props.onAction} />}
          />
        )}
        <Actions.DevicePinAction device={device} onAction={props.onAction} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function CommandActionPanel(props: {
  device: Device;
  command: FunctionItem;
  newName?: string;
  onAction: (props: { result: boolean; command: FunctionItem }) => void;
}): JSX.Element {
  const deviceId = props.device.id;
  const commandValue = props.command.value;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {typeof commandValue === "boolean" && (
          <Actions.BooleanCommand deviceId={deviceId} command={props.command} onAction={props.onAction} />
        )}
        {typeof commandValue === "string" && (
          <Actions.TextCommand
            deviceId={deviceId}
            command={props.command}
            value={commandValue}
            onAction={props.onAction}
          />
        )}
        <Action.Push
          title="Rename"
          icon={Icon.Pencil}
          target={<RenameFunctionForm deviceId={deviceId} command={props.command} onAction={props.onAction} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
