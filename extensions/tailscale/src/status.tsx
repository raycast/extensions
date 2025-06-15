import { updateCommandMetadata } from "@raycast/api";
import { getDevices, getErrorDetails, getStatus } from "./shared";

export default async function Status() {
  let subtitle: string;
  try {
    const data = getStatus();

    // tailscale is guaranteed to be online because getStats throws if it isn't

    const magicDNSSuffix = data.MagicDNSSuffix;
    const devices = getDevices(data);
    const activeExitNode = devices.find((d) => d.exitnode);

    subtitle = `✅ Connected on ${magicDNSSuffix}`;
    if (activeExitNode) {
      subtitle += ` via ${activeExitNode.name}`;
    }
  } catch (err) {
    subtitle = "❌ " + getErrorDetails(err, "").title;
  }
  await updateCommandMetadata({ subtitle });
}
