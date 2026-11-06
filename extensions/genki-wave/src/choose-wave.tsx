import { Action, ActionPanel, Color, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { useState } from "react";

import { bindingsPath, Device, forgetDevice, readDevice, readForgotten, setDevice } from "./bindings";
import { identify, NearbyWave, scan, turnOnBluetooth } from "./helper";
import { restartListener } from "./fixes";

const isChosen = (wave: NearbyWave, chosen?: Device) =>
  !!chosen && (wave.address ? wave.address === chosen.address : wave.id === chosen.id);

// Rough signal bars, so the closest ring is easy to spot.
function signal(rssi?: number): string | undefined {
  if (rssi === undefined) return undefined;
  if (rssi > -55) return "●●●";
  if (rssi > -70) return "●●○";
  return "●○○";
}

export default function ChooseWave() {
  const [chosen, setChosen] = useState<Device | undefined>(() => readDevice());
  const nearby = usePromise(scan, [], { onError: () => undefined });
  const bluetoothOff = nearby.error?.message.includes("Bluetooth is off") ?? false;
  const bluetoothDenied = nearby.error?.message.includes("Bluetooth permission denied") ?? false;
  const turnOn = async () => {
    try {
      await turnOnBluetooth();
      nearby.revalidate();
    } catch (e) {
      await showFailureToast(e, { title: "Couldn't turn on Bluetooth" });
    }
  };
  const forgotten = readForgotten();
  const scanAgain = (
    <Action
      title="Scan Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={nearby.revalidate}
    />
  );

  const choose = async (wave: NearbyWave) => {
    const address = wave.address ?? (isChosen(wave, chosen) ? chosen?.address : undefined);
    if (!address) {
      // Connected by another app (e.g. Softwave), so it isn't advertising its address. With
      // no ring chosen the listener uses a connected Wave and remembers it once it reports
      // its address.
      setDevice(bindingsPath(), undefined);
      setChosen(undefined);
      await restartListener();
      await showToast({ style: Toast.Style.Success, title: "Connecting to the Wave in use by another app" });
      return;
    }
    const device = { address, id: wave.id };
    setDevice(bindingsPath(), device);
    setChosen(device);
    await restartListener();
    await showToast({ style: Toast.Style.Success, title: `Using Wave ${address}` });
  };

  const forget = async (address?: string) => {
    forgetDevice(bindingsPath(), address);
    setChosen(readDevice());
    await restartListener();
    await showToast({
      style: Toast.Style.Success,
      title: "Forgot Wave",
      message: "It won't reconnect until you choose it again",
    });
  };

  const waves = (nearby.data ?? []).sort((a, b) => (b.rssi ?? 0) - (a.rssi ?? 0));
  const chosenNearby = waves.some((w) => isChosen(w, chosen));

  return (
    <List isLoading={nearby.isLoading} searchBarPlaceholder="Filter rings">
      {/* A row, not an empty view: the chosen ring's row would hide an empty view. */}
      {nearby.error && (
        <List.Section title="Scan">
          <List.Item
            icon={{ source: bluetoothOff || bluetoothDenied ? Icon.Bluetooth : Icon.Warning, tintColor: Color.Orange }}
            title={
              bluetoothOff
                ? "Bluetooth is off"
                : bluetoothDenied
                  ? "Raycast isn't allowed to use Bluetooth"
                  : "Couldn't scan for Waves"
            }
            subtitle={
              bluetoothOff
                ? "Turn it on to find your Wave"
                : bluetoothDenied
                  ? "Scanning runs as part of Raycast: allow it under Privacy & Security → Bluetooth"
                  : nearby.error.message
            }
            actions={
              <ActionPanel>
                {bluetoothOff && <Action title="Enable Bluetooth" icon={Icon.Bluetooth} onAction={turnOn} />}
                {bluetoothDenied && (
                  <Action.Open
                    title="Open Bluetooth Settings"
                    icon={Icon.Gear}
                    target="x-apple.systempreferences:com.apple.preference.security?Privacy_Bluetooth"
                  />
                )}
                {scanAgain}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Nearby" subtitle={nearby.isLoading ? "Scanning…" : `${waves.length} found`}>
        {waves.map((wave) => {
          const selected = isChosen(wave, chosen);
          return (
            <List.Item
              key={wave.id}
              icon={{
                source: selected ? Icon.CheckCircle : Icon.Circle,
                tintColor: selected ? Color.Green : undefined,
              }}
              title={wave.address ?? wave.name}
              subtitle={wave.address ? wave.name : selected ? "connected to this Mac" : "in use by another app"}
              accessories={[
                ...(wave.connected ? [{ tag: { value: "Connected", color: Color.Blue } }] : []),
                ...(wave.address && forgotten.includes(wave.address)
                  ? [{ tag: { value: "Forgotten", color: Color.SecondaryText } }]
                  : []),
                ...(signal(wave.rssi) ? [{ text: signal(wave.rssi), tooltip: `${wave.rssi} dBm` }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action title="Use This Wave" icon={Icon.Check} onAction={() => choose(wave)} />
                  {(selected || wave.address) && (
                    <Action
                      title="Forget This Wave"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => forget(wave.address)}
                    />
                  )}
                  {/* A ring without an address is one another app holds: only ours can be told to flash. */}
                  {(wave.address || selected) && (
                    <Action
                      title="Identify"
                      icon={Icon.Eye}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      onAction={async () => {
                        try {
                          await identify(wave.address);
                          await showToast({ style: Toast.Style.Success, title: "Look for the flashing ring" });
                        } catch (e) {
                          await showFailureToast(e, { title: "Identify failed" });
                        }
                      }}
                    />
                  )}
                  {scanAgain}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {chosen && !chosenNearby && (
        <List.Section title="Chosen">
          <List.Item
            icon={{ source: Icon.CheckCircle, tintColor: Color.SecondaryText }}
            title={chosen.address}
            subtitle="not in range"
            actions={
              <ActionPanel>
                {scanAgain}
                <Action
                  title="Forget This Wave"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => forget()}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {!nearby.error && !nearby.isLoading && waves.length === 0 && (
        <List.EmptyView
          icon={Icon.Bluetooth}
          title="No Wave nearby"
          description="Turn the ring on (middle button) and press ⌘R to scan again."
          actions={<ActionPanel>{scanAgain}</ActionPanel>}
        />
      )}
    </List>
  );
}
