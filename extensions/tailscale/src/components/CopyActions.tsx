import { ActionPanel, Action } from "@raycast/api";
import type { Device } from "../shared";

export default function CopyActions({ device }: { device: Device }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={device.ipv4} title="Copy IPv4" />
      <Action.CopyToClipboard
        content={device.dns.endsWith(".") ? device.dns.slice(0, -1) : device.dns}
        title="Copy MagicDNS"
      />
      <Action.CopyToClipboard content={device.ipv6} title="Copy IPv6" />
    </ActionPanel>
  );
}
