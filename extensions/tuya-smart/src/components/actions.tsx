import type { JSX } from "react";
import { Action, ActionPanel, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { ShowToastError } from "../utils/functions";
import { Device, FunctionItem } from "../utils/interfaces";
import { parseEnumOptions, parseRange, percentToRaw, rawToPercent } from "../utils/lightFunctions";
import { enumOptionLabel } from "../utils/deviceSemantics";
import { controlDevice } from "../utils/deviceSource";
import { Transport } from "../utils/deviceControl";

export type CommandResult = { result: boolean; command: FunctionItem };

const viaSuffix = (transport: Transport) => (transport === "local" ? " (over the local network)" : "");

export function DevicePinAction(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const isPinned = props.device.pinned;
  return (
    <Action
      title={isPinned ? "Unpin Device" : "Pin Device"}
      icon={Icon.Pin}
      shortcut={Keyboard.Shortcut.Common.Pin}
      onAction={() => {
        props.onAction({ ...props.device, pinned: !isPinned });
        showToast(Toast.Style.Success, isPinned ? "Unpinned Device" : "Pinned Device", props.device.name);
      }}
    />
  );
}

export function BooleanCommand(props: {
  device: Device;
  command: FunctionItem;
  onAction: (props: CommandResult) => void;
}): JSX.Element {
  const isOn = props.command.value === true;
  const label = props.command.name ?? props.command.code;

  return (
    <Action
      title={isOn ? "Set off" : "Set on"}
      icon={isOn ? Icon.LightBulbOff : Icon.LightBulb}
      onAction={async () => {
        props.onAction(await runCommand(props.device, { ...props.command, value: !isOn }, label, !isOn ? "On" : "Off"));
      }}
    />
  );
}

/**
 * Enum data points such as a curtain's Open/Stop/Close or a light's work mode. The options
 * come from the product's own declared range, so nothing is hardcoded per category.
 */
export function EnumCommand(props: {
  device: Device;
  command: FunctionItem;
  title?: string;
  icon?: Icon;
  onAction: (props: CommandResult) => void;
}): JSX.Element {
  const label = props.command.name ?? props.command.code;
  const options = parseEnumOptions(props.command.values);
  const current = props.command.value;

  return (
    <ActionPanel.Submenu title={props.title ?? label} icon={props.icon ?? Icon.Gear}>
      {options.map((option) => {
        const optionLabel = enumOptionLabel(props.command.code, option);
        return (
          <Action
            key={option}
            title={option === current ? `${optionLabel} (Current)` : optionLabel}
            icon={option === current ? Icon.Check : undefined}
            onAction={async () => {
              props.onAction(await runCommand(props.device, { ...props.command, value: option }, label, optionLabel));
            }}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}

const LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/**
 * Integer data points such as brightness and colour temperature are exposed as
 * percentages; the raw bounds are read from the device because they differ per product.
 */
export function LightLevelSubmenu(props: {
  device: Device;
  command: FunctionItem;
  title: string;
  icon: Icon;
  onAction: (props: CommandResult) => void;
}): JSX.Element {
  const range = parseRange(props.command.values);
  const currentRaw = typeof props.command.value === "number" ? props.command.value : range.min;
  const currentPercent = rawToPercent(currentRaw, range);

  return (
    <ActionPanel.Submenu title={props.title} icon={props.icon}>
      {LEVELS.map((percent) => (
        <Action
          key={percent}
          title={percent === currentPercent ? `${percent}% (Current)` : `${percent}%`}
          icon={percent === currentPercent ? Icon.Check : undefined}
          onAction={async () => {
            const raw = percentToRaw(percent, range);
            props.onAction(
              await runCommand(props.device, { ...props.command, value: raw }, props.title, `${percent}%`),
            );
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

async function runCommand(
  device: Device,
  command: FunctionItem,
  label: string,
  outcome: string,
): Promise<CommandResult> {
  showToast(Toast.Style.Animated, `Setting ${outcome}`, label);

  try {
    const transport = await controlDevice(device, command);
    showToast(Toast.Style.Success, `Set ${outcome}${viaSuffix(transport)}`, label);
    return { result: true, command };
  } catch (error) {
    ShowToastError(error);
    // Hand back the value the device still holds, so even a caller that ignores
    // `result` cannot persist a state that was never applied.
    const unchanged = (device.status ?? []).find((status) => status.code === command.code);
    return { result: false, command: unchanged ?? command };
  }
}
