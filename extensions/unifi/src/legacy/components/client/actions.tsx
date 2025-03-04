import { Action } from "@raycast/api";
import { Client } from "unifi-client";

export function CopyClientIPAction(props: { client: Client }) {
  const ip = props.client.ip;
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

export function CopyClientMacAddressAction(props: { client: Client }) {
  const mac = props.client.mac;
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
