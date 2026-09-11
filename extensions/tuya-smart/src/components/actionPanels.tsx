import type { JSX } from "react";
import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { Device, FunctionItem } from "../utils/interfaces";
import { findBrightness, findColorTemp } from "../utils/lightFunctions";
import { isSwitchStatus } from "../utils/filters";
import {
  actionableEnums,
  actionableStatuses,
  applyCommandResult,
  classifyDevice,
  cleanName,
} from "../utils/deviceSemantics";

import { DeviceCommands } from "./deviceCommands";

import * as Actions from "./actions";
import RenameFunctionForm from "./renameFunction";

export function DeviceActionPanel(props: {
  device: Device;
  onAction: (device: Device) => void;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}): JSX.Element {
  const device = props.device;
  const switches = (device.status ?? []).filter(isSwitchStatus);
  const brightness = findBrightness(device);
  const colorTemp = findColorTemp(device);
  const isControl = classifyDevice(device) === "control";
  // A curtain has no boolean switch, so nothing else on this panel would reach its
  // Open/Stop/Close. Devices that do have a switch keep their enums behind the push
  // below, to leave settings like a socket's power-on behaviour out of the main panel.
  const enums = switches.length === 0 ? actionableEnums(device) : [];
  const commandCount = actionableStatuses(device).length;

  const apply = (outcome: Actions.CommandResult) => props.onAction(applyCommandResult(device, outcome));

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isControl && switches.length === 1 && (
          <Actions.BooleanCommand device={device} command={switches[0]} onAction={apply} />
        )}
        {enums.map((command) => (
          <Actions.EnumCommand key={command.code} device={device} command={command} onAction={apply} />
        ))}
        {commandCount > 1 && (
          <Action.Push
            title="Show Controls"
            icon={Icon.Document}
            target={<DeviceCommands device={device} onAction={props.onAction} />}
          />
        )}
        <Actions.DevicePinAction device={device} onAction={props.onAction} />
        <Action
          title={props.isShowingDetail ? "Hide Details" : "Show Details"}
          icon={Icon.AppWindowSidebarRight}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={props.onToggleDetail}
        />
      </ActionPanel.Section>
      {(brightness || colorTemp) && (
        <ActionPanel.Section title="Light">
          {brightness && (
            <Actions.LightLevelSubmenu
              device={device}
              command={brightness}
              title="Brightness"
              icon={Icon.Sun}
              onAction={apply}
            />
          )}
          {colorTemp && (
            <Actions.LightLevelSubmenu
              device={device}
              command={colorTemp}
              title="Colour Temperature"
              icon={Icon.Temperature}
              onAction={apply}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {switches.length === 1 && (
          <Action.Push
            title="Rename Switch"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<RenameFunctionForm deviceId={device.id} command={switches[0]} onAction={apply} />}
          />
        )}
        <Action.CopyToClipboard title="Copy Device ID" content={device.id} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          title="Copy Device Name"
          content={cleanName(device.name)}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function CommandActionPanel(props: {
  device: Device;
  command: FunctionItem;
  onAction: (props: Actions.CommandResult) => void;
}): JSX.Element {
  const commandValue = props.command.value;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {typeof commandValue === "boolean" && (
          <Actions.BooleanCommand device={props.device} command={props.command} onAction={props.onAction} />
        )}
        {typeof commandValue === "string" && (
          <Actions.EnumCommand device={props.device} command={props.command} onAction={props.onAction} />
        )}
        {typeof commandValue === "number" && (
          <Actions.LightLevelSubmenu
            device={props.device}
            command={props.command}
            title={props.command.name ?? props.command.code}
            icon={Icon.Gauge}
            onAction={props.onAction}
          />
        )}
        <Action.Push
          title="Rename"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<RenameFunctionForm deviceId={props.device.id} command={props.command} onAction={props.onAction} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
