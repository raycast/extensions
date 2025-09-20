import { Action, Icon, showToast, Toast } from "@raycast/api";
import { sendCommand } from "../utils/tuyaConnector";
import { Device, FunctionItem } from "../utils/interfaces";

export function DevicePinAction(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const isPinned = props.device.pinned;
  return (
    <Action
      title={isPinned ? "Unpin" : "Pin"}
      icon={Icon.Pin}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onAction={async () => {
        if (isPinned) {
          props.onAction(await unpin(props.device));
        } else {
          props.onAction(await pin(props.device));
        }
      }}
    />
  );
}

export function BooleanCommand(props: {
  deviceId: string;
  command: FunctionItem;
  onAction: (props: { result: boolean; command: FunctionItem }) => void;
}): JSX.Element {
  const isOn = props.command.value;
  return (
    <Action
      title={isOn ? "Set Off" : "Set On"}
      icon={Icon.Pin}
      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      onAction={async () => {
        if (!isOn) {
          props.onAction(await onCommand(props.deviceId, props.command));
        } else {
          props.onAction(await offCommand(props.deviceId, props.command));
        }
      }}
    />
  );
}

export function TextCommand(props: {
  deviceId: string;
  command: FunctionItem;
  value: string;
  onAction: (props: { result: boolean; command: FunctionItem }) => void;
}): JSX.Element {
  return (
    <Action
      title={`Set ${props.value}`}
      icon={Icon.Pin}
      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      onAction={async () => {
        props.onAction(await sendTextCommand(props.deviceId, { ...props.command, value: props.value }));
      }}
    />
  );
}

async function sendTextCommand(
  deviceId: string,
  command: FunctionItem
): Promise<{ result: boolean; command: FunctionItem }> {
  showToast(Toast.Style.Animated, `Turning ${command.code} ${command.value}`);

  try {
    const result = await sendCommand({
      device_id: deviceId,
      commands: [
        {
          code: command.code,
          value: command.value,
        },
      ],
    });
    if (result) {
      showToast(Toast.Style.Success, `Turned ${command.code} ${command.value}`);
      return { result: true, command };
    }
    showToast(Toast.Style.Failure, `Send Text Command ${command.code} failed`);
    return { result: false, command };
  } catch (err) {
    showToast(Toast.Style.Failure, `Send Text Command ${command.code} failed`);
    return { result: false, command };
  }
}

async function onCommand(deviceId: string, command: FunctionItem): Promise<{ result: boolean; command: FunctionItem }> {
  showToast(Toast.Style.Animated, `Turning On ${command.code}`);

  try {
    const result = await sendCommand({
      device_id: deviceId,
      commands: [
        {
          code: command.code,
          value: !command.value,
        },
      ],
    });
    if (result) {
      command.value = !command.value;
      showToast(Toast.Style.Success, `Turned On ${command.code}`);
      return { result: true, command };
    }
    showToast(Toast.Style.Failure, `On Command ${command.code} failed`);
    return { result: false, command };
  } catch (err) {
    showToast(Toast.Style.Failure, `On Command ${command.code} failed`);
    return { result: false, command };
  }
}

async function offCommand(
  deviceId: string,
  command: FunctionItem
): Promise<{ result: boolean; command: FunctionItem }> {
  showToast(Toast.Style.Animated, `Turning Off ${command.code}`);

  try {
    const result = await sendCommand({
      device_id: deviceId,
      commands: [
        {
          code: command.code,
          value: !command.value,
        },
      ],
    });
    if (result) {
      command.value = !command.value;
      showToast(Toast.Style.Success, `Turned On ${command.code}`);
      return { result: true, command };
    }
    showToast(Toast.Style.Failure, `On Command ${command.code} failed`);
    return { result: false, command };
  } catch (err) {
    showToast(Toast.Style.Failure, `Off Command ${command.code} failed`);
    return { result: false, command };
  }
}

async function pin(device: Device): Promise<Device> {
  showToast(Toast.Style.Animated, `Pinning ${device.name}`);
  try {
    device.pinned = true;
    showToast(Toast.Style.Success, `Pinned ${device.name}`);
    return device;
  } catch (err) {
    showToast(Toast.Style.Failure, `Pin ${device.name} failed`);
    return device;
  }
}

async function unpin(device: Device): Promise<Device> {
  showToast(Toast.Style.Animated, `Unpinning ${device.name}`);
  try {
    device.pinned = false;
    showToast(Toast.Style.Success, `Unpinned ${device.name}`);
    return device;
  } catch (err) {
    showToast(Toast.Style.Failure, `Unpin ${device.name} failed`);
    return device;
  }
}
