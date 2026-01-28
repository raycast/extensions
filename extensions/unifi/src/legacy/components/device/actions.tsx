import { Action } from "@raycast/api";
import { tDevice } from "unifi-client";

export function CopyDeviceIPAction(props: { device: tDevice }) {
  const ip = props.device.ip;
  if (!ip) {
    return null;
  }
  return (
    <Action.CopyToClipboard
      title="Copy Ip to Clipboard"
      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      content={ip}
    />
  );
}

export function CopyDeviceMacAddressAction(props: { device: tDevice }) {
  const mac = props.device.mac;
  if (!mac) {
    return null;
  }
  return (
    <Action.CopyToClipboard
      title="Copy Mac Address to Clipboard"
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      content={mac}
    />
  );
}
