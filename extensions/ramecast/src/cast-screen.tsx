import { Action, ActionPanel, Color, Icon, Keyboard, List, open, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { Discovered, discoverAll, initialDiscovered } from "./lib/discover";
import { adapterFor, Device, Protocol } from "./lib/protocols";
import { openSystemMirroring, SystemTarget } from "./lib/protocols/system";
import { CancelledError, ScreenPermissionError, startCast, stopCast } from "./lib/stream";

const TAG_COLOR: Record<Protocol, Color> = {
  googlecast: Color.Blue,
  roku: Color.Purple,
  dlna: Color.Orange,
};

export default function Command() {
  // Devices appear as they answer; `live` holds the scan in progress, `data` the finished one.
  const [live, setLive] = useState<Discovered>(initialDiscovered);
  const scanId = useRef(0);
  const { data, isLoading, error, revalidate } = usePromise(
    async () => {
      // A refresh starts a new scan; progress from older scans still running is ignored.
      const id = ++scanId.current;
      setLive(initialDiscovered());
      return discoverAll((found) => {
        if (id === scanId.current) setLive(found);
      });
    },
    [],
    {
      failureToastOptions: { title: "Could not search for devices" },
      onData: (result) => {
        if (result.errors.length) {
          showToast({
            style: Toast.Style.Failure,
            title: "Some device types couldn't be searched",
            message: result.errors.join("\n"),
          });
        }
      },
    },
  );
  const found = isLoading ? live : (data ?? live);
  const casting = useRef(false);

  async function cast(device: Device) {
    if (casting.current) {
      await showToast({ style: Toast.Style.Failure, title: "A cast is already starting" });
      return;
    }
    casting.current = true;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Casting to ${device.name}…` });
    try {
      await startCast(device, (message) => (toast.message = message));
      toast.style = Toast.Style.Success;
      toast.title = `Casting to ${device.name}`;
      toast.message = undefined;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = e instanceof CancelledError ? "Cast cancelled" : "Could not start casting";
      toast.message = e instanceof Error ? e.message : String(e);
      if (e instanceof ScreenPermissionError) {
        toast.primaryAction = {
          title: "Open Screen Recording Settings",
          onAction: () => open("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"),
        };
      }
    } finally {
      casting.current = false;
    }
  }

  async function stop() {
    try {
      const active = await stopCast();
      await showToast({
        style: Toast.Style.Success,
        title: active ? `Stopped casting to ${active.device.name}` : "Nothing is being cast",
      });
    } catch (e) {
      await showFailureToast(e, { title: "Could not stop casting" });
    }
  }

  async function mirror(target: SystemTarget) {
    try {
      await openSystemMirroring(target);
    } catch (e) {
      await showFailureToast(e, { title: "Could not open screen mirroring" });
    }
  }

  const refresh = (
    <Action
      title="Refresh Devices"
      icon={Icon.ArrowClockwise}
      onAction={revalidate}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
  const nothingFound = !isLoading && !found.devices.length && !found.system.length;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a device to cast your screen to">
      {error && nothingFound ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not search for devices"
          description={error.message}
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Wifi}
          title={isLoading ? "Searching for devices…" : "No devices found"}
          description="Make sure your computer and the device are on the same network."
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      )}
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
                <Action title="Stop Casting" icon={Icon.Stop} onAction={stop} />
                {refresh}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="System Mirroring" subtitle="Opens your system's screen mirroring">
        {found.system.map((t) => (
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
                  onAction={() => mirror(t)}
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
