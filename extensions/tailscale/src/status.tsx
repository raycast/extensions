import { updateCommandMetadata } from "@raycast/api";
import { getDevices, getStatus } from "./shared";

export default async function Status() {
  let subtitle: string;
  try {
    const data = getStatus();

    // tailscale is guaranteed to be online because getStats throws if it isn't

    const hostname = data.Self.HostName;
    const devices = getDevices(data);
    const activeExitNode = devices.find((d) => d.exitnode);

    subtitle = `✅ Tailscale is connected on ${hostname}`;
    if (activeExitNode) {
      subtitle += ` via ${activeExitNode.name}`;
    }
  } catch {
    subtitle = "❌ Tailscale is offline.";
  }
  await updateCommandMetadata({ subtitle });
}
