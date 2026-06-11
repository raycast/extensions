import { MenuBarExtra, getPreferenceValues, openExtensionPreferences, Clipboard, Image, showHUD } from "@raycast/api";
import { getDevices, getStatus } from "./shared";

const ICONS: Record<string, Image.ImageLike> = {
  command_icon: { source: "command-icon.png" },
  connected: {
    source: {
      light: "connected_light.png",
      dark: "connected_dark.png",
    },
  },
  link_emoji: "🔗",
};

export default function MenuBar() {
  try {
    const data = getStatus();
    const prefs = getPreferenceValues<Preferences.Menubar>();

    const hostname = data.Self.HostName;
    const ip = data.Self.TailscaleIPs[0];
    const tailnetName = data.CurrentTailnet.Name;
    const activeExitNode = getDevices(data).find((d) => d.exitnode);

    let barTitle = "";
    if (prefs.showHostname) barTitle += hostname;
    if (prefs.showIP) barTitle += (barTitle ? " · " : "") + ip;
    if (prefs.showTailnetName) barTitle += (barTitle ? " · " : "") + tailnetName;
    if (activeExitNode) barTitle += (barTitle ? " · " : "") + `via ${activeExitNode.name}`;

    const icon = ICONS[prefs.iconStyle] ?? ICONS["command_icon"];

    return (
      <MenuBarExtra icon={icon} title={barTitle || undefined} tooltip="Tailscale connected">
        <MenuBarExtra.Section title="Connected">
          <MenuBarExtra.Item
            title={hostname}
            subtitle="hostname"
            onAction={async () => {
              await Clipboard.copy(hostname);
              await showHUD("Copied hostname");
            }}
          />
          <MenuBarExtra.Item
            title={ip}
            subtitle="IPv4"
            onAction={async () => {
              await Clipboard.copy(ip);
              await showHUD("Copied IP address");
            }}
          />
          {activeExitNode && (
            <MenuBarExtra.Item
              title={activeExitNode.name}
              subtitle="exit node"
              onAction={async () => {
                await Clipboard.copy(activeExitNode.name);
                await showHUD("Copied exit node name");
              }}
            />
          )}
          <MenuBarExtra.Item
            title={tailnetName}
            subtitle="tailnet"
            onAction={async () => {
              await Clipboard.copy(tailnetName);
              await showHUD("Copied tailnet name");
            }}
          />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Preferences…" onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  } catch {
    return null;
  }
}
