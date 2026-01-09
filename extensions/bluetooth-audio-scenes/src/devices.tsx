import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import {
  findMatchingOutput,
  getCurrentOutputName,
  hasMatchingOutput,
  listOutputDevices,
  setOutputByName,
} from "./lib/audio";
import {
  type BtDevice,
  connect,
  disconnect,
  isConnected,
  listPairedBluetoothDevices,
  waitForConnected,
} from "./lib/bluetooth";
import { MissingDependenciesView, requireBluetooth, useDependencyCheck } from "./lib/dependencies";
import { checkBluetoothDependency } from "./lib/exec";
import { LAST_USED_KEY, type LastUsedMap, OUTPUT_MAP_KEY, type OutputMap } from "./lib/storage";

// Maps BT address -> previous output name (for restore on toggle off)
type RestoreMap = Record<string, string>;

const RESTORE_KEY = "devices-restore-map";

export default function Devices() {
  const { data: missingDeps = [], isLoading: checkingDeps, revalidate: recheckDeps } = useDependencyCheck();

  const { value: outputMap = {}, setValue: setOutputMap } = useLocalStorage<OutputMap>(OUTPUT_MAP_KEY, {});
  const { value: restoreMap = {}, setValue: setRestoreMap } = useLocalStorage<RestoreMap>(RESTORE_KEY, {});
  const { value: lastUsedMap = {}, setValue: setLastUsedMap } = useLocalStorage<LastUsedMap>(LAST_USED_KEY, {});

  const {
    data: { devices, audioOutputs } = { devices: [], audioOutputs: [] },
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    // Check if blueutil is available before trying to list BT devices
    const hasBluetooth = await checkBluetoothDependency();

    const [paired, outputs] = await Promise.all([
      hasBluetooth ? listPairedBluetoothDevices(false) : Promise.resolve([]),
      listOutputDevices(),
    ]);

    // Deduplicate devices by address (blueutil can return duplicates)
    const uniquePaired = paired.filter(
      (device, index, self) => index === self.findIndex((d) => d.address === device.address),
    );

    const withStatus = hasBluetooth
      ? await Promise.all(
          uniquePaired.map(async (d) => ({
            ...d,
            connected: await isConnected(d.address),
          })),
        )
      : [];

    return { devices: withStatus, audioOutputs: outputs };
  }, []);

  const { push } = useNavigation();

  async function markUsed(address: string) {
    await setLastUsedMap({ ...lastUsedMap, [address]: Date.now() });
  }

  async function connectAndSetOutput(device: BtDevice) {
    // Check blueutil availability
    if (!(await requireBluetooth())) {
      return;
    }

    // Save current output for restore
    const current = await getCurrentOutputName();
    await setRestoreMap({ ...restoreMap, [device.address]: current });

    // Connect
    await showToast({
      style: Toast.Style.Animated,
      title: `Connecting: ${device.name}`,
    });
    try {
      await connect(device.address);
      await waitForConnected(device.address, 12_000);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Connection failed: ${device.name}`,
        message: e instanceof Error ? e.message : String(e),
      });
      return;
    }

    // Mark as recently used
    await markUsed(device.address);

    // Try to find audio output (in order of priority):
    // 1. Saved mapping from previous user selection
    // 2. Auto-match by name
    // 3. Ask user to pick

    const savedOutput = outputMap[device.address];
    if (savedOutput) {
      try {
        await setOutputByName(savedOutput);
        await showToast({
          style: Toast.Style.Success,
          title: `Output: ${savedOutput}`,
        });
        revalidate();
        return;
      } catch {
        // Saved output no longer exists, continue to auto-match
      }
    }

    const autoMatched = await findMatchingOutput(device.name);
    if (autoMatched) {
      await setOutputByName(autoMatched);
      await showToast({
        style: Toast.Style.Success,
        title: `Output: ${autoMatched}`,
      });
      revalidate();
      return;
    }

    // Auto-match failed - need user to pick
    await showToast({
      style: Toast.Style.Animated,
      title: "Select audio output",
      message: "Couldn't auto-detect, please pick from list",
    });

    push(
      <OutputPicker
        device={device}
        onSelect={async (outputName) => {
          // Save mapping for future
          await setOutputMap({ ...outputMap, [device.address]: outputName });
          await setOutputByName(outputName);
          await showToast({
            style: Toast.Style.Success,
            title: `Output: ${outputName}`,
          });
          revalidate();
        }}
      />,
    );
  }

  async function toggle(device: BtDevice) {
    // Check blueutil availability
    if (!(await requireBluetooth())) {
      return;
    }

    const connected = await isConnected(device.address);

    if (connected) {
      await showToast({
        style: Toast.Style.Animated,
        title: `Disconnecting: ${device.name}`,
      });
      await disconnect(device.address);

      const restore = restoreMap[device.address];
      if (restore) {
        await setOutputByName(restore).catch(() => {
          // ignore - best effort restore
        });
      }

      await showToast({
        style: Toast.Style.Success,
        title: `Disconnected: ${device.name}`,
      });
      revalidate();
      return;
    }

    await connectAndSetOutput(device);
  }

  async function forgetOutputMapping(device: BtDevice) {
    const newMap = { ...outputMap };
    delete newMap[device.address];
    await setOutputMap(newMap);
    await showToast({
      style: Toast.Style.Success,
      title: "Output mapping cleared",
    });
  }

  if (!checkingDeps && missingDeps.length > 0) {
    return <MissingDependenciesView missing={missingDeps} onRecheck={recheckDeps} />;
  }

  // Get non-Bluetooth outputs (built-in, DisplayPort, virtual, etc.)
  const getNonBluetoothOutputs = () => {
    // Get names of outputs that are mapped to Bluetooth devices
    const btOutputNames = new Set(Object.values(outputMap));
    // Also exclude outputs that fuzzy-match Bluetooth device names
    const btDeviceNames = devices.map((d) => d.name.toLowerCase());

    return audioOutputs.filter((o) => {
      // Exclude if it's mapped to a BT device
      if (btOutputNames.has(o.name)) {
        return false;
      }
      // Exclude if it matches a BT device name (likely a BT audio device)
      const nameLower = o.name.toLowerCase();
      return !btDeviceNames.some((btName) => nameLower.includes(btName) || btName.includes(nameLower));
    });
  };

  async function setOutputOnly(outputName: string) {
    await showToast({
      style: Toast.Style.Animated,
      title: `Switching to: ${outputName}`,
    });
    try {
      await setOutputByName(outputName);
      await showToast({
        style: Toast.Style.Success,
        title: `Output: ${outputName}`,
      });
      revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch output",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <List isLoading={isLoading || checkingDeps} searchBarPlaceholder="Search audio devices...">
      {devices.length === 0 && audioOutputs.length === 0 && !isLoading && (
        <List.EmptyView description="No audio devices found." icon={Icon.Speaker} title="No devices" />
      )}

      {(() => {
        const sorted = [...devices].sort((a, b) => (lastUsedMap[b.address] ?? 0) - (lastUsedMap[a.address] ?? 0));

        // Split Bluetooth devices into audio and other
        const btAudioDevices = sorted.filter((d) => outputMap[d.address] || hasMatchingOutput(d.name, audioOutputs));
        const btOtherDevices = sorted.filter((d) => !(outputMap[d.address] || hasMatchingOutput(d.name, audioOutputs)));

        // Non-Bluetooth outputs
        const otherOutputs = getNonBluetoothOutputs();

        const renderBtDevice = (d: BtDevice, keyPrefix: string) => {
          const savedOutput = outputMap[d.address];
          return (
            <List.Item
              accessories={[
                ...(savedOutput ? [{ text: `→ ${savedOutput}`, icon: Icon.Speaker }] : []),
                { text: d.connected ? "Connected" : "" },
              ]}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Speaker} onAction={() => connectAndSetOutput(d)} title="Connect + Set Output" />
                  <Action icon={Icon.Eject} onAction={() => toggle(d)} title="Connect / Disconnect" />
                  {savedOutput && (
                    <Action
                      icon={Icon.Trash}
                      onAction={() => forgetOutputMapping(d)}
                      style={Action.Style.Destructive}
                      title="Forget Output Mapping"
                    />
                  )}
                  <Action
                    icon={Icon.RotateClockwise}
                    onAction={revalidate}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    title="Refresh"
                  />
                </ActionPanel>
              }
              icon={d.connected ? Icon.Link : Icon.Bluetooth}
              key={`${keyPrefix}-${d.address}`}
              subtitle={d.connected ? "Connected" : ""}
              title={d.name}
            />
          );
        };

        const renderOutput = (o: { name: string }) => (
          <List.Item
            actions={
              <ActionPanel>
                <Action icon={Icon.Speaker} onAction={() => setOutputOnly(o.name)} title="Set Output" />
                <Action
                  icon={Icon.RotateClockwise}
                  onAction={revalidate}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  title="Refresh"
                />
              </ActionPanel>
            }
            icon={Icon.Speaker}
            key={o.name}
            title={o.name}
          />
        );

        return (
          <>
            {btAudioDevices.length > 0 && (
              <List.Section title="Bluetooth Audio">
                {btAudioDevices.map((d) => renderBtDevice(d, "bt-audio"))}
              </List.Section>
            )}
            {otherOutputs.length > 0 && (
              <List.Section title="Other Outputs">{otherOutputs.map(renderOutput)}</List.Section>
            )}
            {btOtherDevices.length > 0 && (
              <List.Section title="Other Bluetooth">
                {btOtherDevices.map((d) => renderBtDevice(d, "bt-other"))}
              </List.Section>
            )}
          </>
        );
      })()}
    </List>
  );
}

function OutputPicker(props: { device: BtDevice; onSelect: (outputName: string) => Promise<void> }) {
  const { pop } = useNavigation();

  const { data: outputs = [], isLoading } = useCachedPromise(async () => {
    return await listOutputDevices();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Which output is "${props.device.name}"?`}
      searchBarPlaceholder="Search audio outputs..."
    >
      <List.Section title="We'll remember your choice">
        {outputs.map((o) => (
          <List.Item
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Speaker}
                  onAction={async () => {
                    await props.onSelect(o.name);
                    pop();
                  }}
                  title="Select Output"
                />
              </ActionPanel>
            }
            icon={Icon.Speaker}
            key={o.name}
            title={o.name}
          />
        ))}
      </List.Section>
    </List>
  );
}
