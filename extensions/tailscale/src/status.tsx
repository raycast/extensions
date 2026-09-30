import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { getDevices, getErrorDetails, getStatus } from "./shared";

export default async function Status() {
  let subtitle: string;
  try {
    const data = getStatus();

    // tailscale is guaranteed to be online because getStatus throws if it isn't

    const prefs = getPreferenceValues<Preferences.Status>();

    const hostname = data.Self.HostName;
    const ip = data.Self.TailscaleIPs[0];
    const tailnetName = data.CurrentTailnet.Name;

    const activeExitNode = getDevices(data).find((d) => d.exitnode);

    subtitle = "✅ Connected";

    if (prefs.showHostname) subtitle += ` as ${hostname}`;
    if (prefs.showIP) subtitle += ` (${ip})`;
    if (activeExitNode) subtitle += ` via ${activeExitNode.name}`;
    if (prefs.showTailnetName) subtitle += ` on ${tailnetName}`;
  } catch (err) {
    subtitle = "❌ " + getErrorDetails(err, "").title;
  }
  await updateCommandMetadata({ subtitle });
}
