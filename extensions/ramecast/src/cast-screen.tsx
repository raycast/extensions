import { Action, ActionPanel, Color, Icon, Keyboard, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Discovered, discoverAll } from "./lib/discover";
import { adapterFor, Device, Protocol } from "./lib/protocols";
import { openSystemMirroring, SystemTarget } from "./lib/protocols/system";
import { ScreenPermissionError, startCast, stopCast } from "./lib/stream";

const TAG_COLOR: Record<Protocol, Color> = {
  googlecast: Color.Blue,
  roku: Color.Purple,
  dlna: Color.Orange,
};

export default function Command() {
  const [found, setFound] = useState<Discovered>({ devices: [], system: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [scan, setScan] = useState(0);
  const rescan = () => setScan((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    discoverAll((f) => !cancelled && setFound(f)).then(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scan]);

  async function cast(device: Device) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Casting to ${device.name}…` });
    try {
      await startCast(device, (message) => (toast.message = message));
      toast.style = Toast.Style.Success;
      toast.title = `Casting to ${device.name}`;
      toast.message = undefined;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start casting";
      toast.message = e instanceof Error ? e.message : String(e);
      if (e instanceof ScreenPermissionError) {
        toast.primaryAction = {
          title: "Open Screen Recording Settings",
          onAction: () => open("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"),
        };
      }
    }
  }

  const refresh = (
    <Action
      title="Refresh Devices"
      icon={Icon.ArrowClockwise}
      onAction={rescan}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a device to cast your screen to">
      <List.EmptyView
        icon={Icon.Wifi}
        title={isLoading ? "Searching for devices…" : "No devices found"}
        description="Make sure your computer and the device are on the same network."
        actions={<ActionPanel>{refresh}</ActionPanel>}
      />
      <List.Section title="Cast Devices" subtitle="Streamed by RameCast">
        {found.devices.map((d) => (
          <List.Item
            key={`${d.protocol}:${d.id}`}
            icon={Icon.Monitor}
            title={d.name}
            subtitle={d.model}
            keywords={[adapterFor(d.protocol).label, d.host]}
            accessories={[
              { tag: { value: adapterFor(d.protocol).label, color: TAG_COLOR[d.protocol] } },
              { text: d.host },
            ]}
            actions={
              <ActionPanel>
                <Action title="Cast Screen" icon={Icon.Play} onAction={() => cast(d)} />
                <Action title="Stop Casting" icon={Icon.Stop} onAction={() => stopCast()} />
                {refresh}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="System Mirroring" subtitle="Opens your system's screen mirroring">
        {found.system.map((t: SystemTarget) => (
          <List.Item
            key={`${t.kind}:${t.id}`}
            icon={t.kind === "airplay" ? Icon.Livestream : Icon.Desktop}
            title={t.name}
            subtitle={t.model}
            accessories={[
              { tag: { value: t.kind === "airplay" ? "AirPlay" : "Miracast", color: Color.SecondaryText } },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={t.kind === "airplay" ? "Mirror with AirPlay" : "Open Cast Panel"}
                  icon={Icon.Play}
                  onAction={() => openSystemMirroring(t)}
                />
                {refresh}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
