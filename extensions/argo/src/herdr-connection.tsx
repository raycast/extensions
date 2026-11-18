import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useHerdr } from "./herdr-feed.js";
import { safeMarkdown } from "./core.js";

export async function openHerdr() {
  try {
    await open("/Applications/Herdr.app");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Herdr",
      message: "Install Herdr or open it from its installation location.",
    });
  }
}
export function HerdrConnection() {
  const feed = useHerdr();
  return (
    <Detail
      navigationTitle="Herdr Connection"
      isLoading={feed.loading}
      markdown={`# ${feed.error ? "Herdr Needs Attention" : "Herdr Connected"}\n\n${safeMarkdown(feed.error || `${feed.name} is connected directly. Its local terminals and configured remote machines appear in Agent Sessions.`)}\n\n## Use an Existing Core\n\nOpen Herdr, then refresh. Argo connects to its existing private Unix socket and never starts a core during discovery. No Argo bridge or pairing code is required.\n\n## Custom Session\n\nSet **Herdr Socket Path** in Argo preferences when using a custom HC session or socket configuration. GUI applications may not inherit your shell environment.\n\n## Terminal Controls\n\nOutput, task input, single-key authorization and text replies stay inside Raycast. Herdr supplies terminal text, not a structured conversation or an atomic approval transaction. Machine login and upgrades remain in Herdr.\n\nThe socket grants terminal control with your account's access. Use only your own private socket. Argo does not forward its raw API or copy remote credentials.`}
      actions={
        <ActionPanel>
          <Action
            title="Reconnect Herdr"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={feed.reconnect}
          />
          <Action title="Open Herdr" icon={Icon.AppWindow} onAction={openHerdr} />
          <Action title="Set Herdr Socket Path" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
