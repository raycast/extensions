import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  open,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  Device,
  AudioEndpoint,
  BluetoothStatus,
  listDevices,
  connectDevice,
  disconnectDevice,
  removeDevice,
  getStatus,
  toggleBluetooth,
  listAudioEndpoints,
  setAudioDefault,
  matchAudioEndpoint,
} from "./bluetooth";

export default function ManageDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [status, setStatus] = useState<BluetoothStatus | null>(null);
  const [audioEndpoints, setAudioEndpoints] = useState<AudioEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [devs, st, audio] = await Promise.all([
      listDevices(),
      getStatus(),
      listAudioEndpoints(),
    ]);
    setDevices(devs);
    setStatus(st.data ?? null);
    setAudioEndpoints(audio);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleToggle() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Toggling Bluetooth…",
    });
    const result = await toggleBluetooth();
    if (result.success && result.data) {
      const { bluetoothEnabled, adapterName } = result.data;
      toast.style = Toast.Style.Success;
      toast.title = bluetoothEnabled ? "Bluetooth On" : "Bluetooth Off";
      toast.message = adapterName;
      await refresh();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Toggle failed";
      toast.message = result.error;
    }
  }

  async function handleConnect(device: Device) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Connecting to ${device.name}…`,
    });
    const result = await connectDevice(device.id);
    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Connected";
      toast.message = device.name;
      await refresh();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = result.error;
    }
  }

  async function handleDisconnect(device: Device) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Disconnecting ${device.name}…`,
    });
    const result = await disconnectDevice(device.id);
    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Disconnected";
      toast.message = device.name;
      await refresh();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Disconnect failed";
      toast.message = result.error;
    }
  }

  async function handleRemove(device: Device) {
    const confirmed = await confirmAlert({
      title: `Remove "${device.name}"?`,
      message:
        "This will unpair the device. You'll need to pair it again to use it.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Removing ${device.name}…`,
    });
    const result = await removeDevice(device.id);
    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Device removed";
      toast.message = device.name;
      await refresh();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Remove failed";
      toast.message = result.error;
    }
  }

  async function handleSetAudio(device: Device, endpoint: AudioEndpoint) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Setting ${device.name} as audio output…`,
    });
    const result = await setAudioDefault(endpoint.endpointId);
    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Audio output changed";
      toast.message = device.name;
      await refresh();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to set audio device";
      toast.message = result.error;
    }
  }

  const connectedDevices = devices.filter((d) => d.isConnected);
  const availableDevices = devices.filter((d) => !d.isConnected);

  const btEnabled = status?.enabled ?? true;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter devices…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Bluetooth Adapter Status"
          onChange={() => {
            /* read-only indicator */
          }}
        >
          <List.Dropdown.Item
            title={`${btEnabled ? "● On" : "○ Off"} – ${status?.adapterName ?? "Bluetooth"}`}
            value="status"
          />
        </List.Dropdown>
      }
    >
      {!isLoading && devices.length === 0 && (
        <List.EmptyView
          icon={Icon.Bluetooth}
          title="No Paired Devices"
          description="Pair a Bluetooth device in Windows Settings, then refresh."
          actions={
            <ActionPanel>
              <Action
                title="Open Bluetooth Settings"
                icon={Icon.Gear}
                onAction={() => open("ms-settings:bluetooth")}
              />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      )}

      {connectedDevices.length > 0 && (
        <List.Section title="Connected" subtitle={`${connectedDevices.length}`}>
          {connectedDevices.map((d) => (
            <DeviceItem
              key={d.id}
              device={d}
              audioEndpoint={matchAudioEndpoint(d.name, audioEndpoints)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onRemove={handleRemove}
              onSetAudio={handleSetAudio}
              onRefresh={refresh}
              onToggleBt={handleToggle}
            />
          ))}
        </List.Section>
      )}

      {availableDevices.length > 0 && (
        <List.Section
          title="Paired – Not Connected"
          subtitle={`${availableDevices.length}`}
        >
          {availableDevices.map((d) => (
            <DeviceItem
              key={d.id}
              device={d}
              audioEndpoint={undefined}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onRemove={handleRemove}
              onSetAudio={handleSetAudio}
              onRefresh={refresh}
              onToggleBt={handleToggle}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function DeviceItem({
  device,
  audioEndpoint,
  onConnect,
  onDisconnect,
  onRemove,
  onSetAudio,
  onRefresh,
  onToggleBt,
}: {
  device: Device;
  audioEndpoint: AudioEndpoint | undefined;
  onConnect: (d: Device) => void;
  onDisconnect: (d: Device) => void;
  onRemove: (d: Device) => void;
  onSetAudio: (d: Device, ep: AudioEndpoint) => void;
  onRefresh: () => void;
  onToggleBt: () => void;
}) {
  const btIcon = device.isConnected
    ? { source: Icon.Bluetooth, tintColor: Color.Blue }
    : { source: Icon.Bluetooth, tintColor: Color.SecondaryText };

  // Build accessories: MAC address + device kind tag + audio speaker badge
  const accessories: List.Item.Accessory[] = [];

  if (device.isConnected && audioEndpoint) {
    if (audioEndpoint.isDefaultOutput) {
      accessories.push({
        icon: { source: Icon.SpeakerOn, tintColor: Color.Green },
        tooltip: "Default audio output",
      });
    } else {
      accessories.push({
        icon: { source: Icon.SpeakerOn, tintColor: Color.SecondaryText },
        tooltip: "Audio available — not default output",
      });
    }
  }

  accessories.push({
    tag: { value: device.deviceKind, color: Color.SecondaryText },
  });

  if (device.deviceAddress) {
    accessories.unshift({ text: device.deviceAddress, tooltip: "MAC Address" });
  }

  return (
    <List.Item
      icon={btIcon}
      title={device.name}
      subtitle={device.isConnected ? "Connected" : "Disconnected"}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={device.name}>
            {device.isConnected ? (
              <Action
                title="Disconnect"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Orange }}
                onAction={() => onDisconnect(device)}
              />
            ) : (
              <Action
                title="Connect"
                icon={{ source: Icon.ArrowRightCircle, tintColor: Color.Green }}
                onAction={() => onConnect(device)}
              />
            )}

            {/* Audio output actions — only for connected devices with a matched endpoint */}
            {device.isConnected &&
              audioEndpoint &&
              !audioEndpoint.isDefaultOutput && (
                <Action
                  title="Set as Audio Output"
                  icon={{ source: Icon.SpeakerOn, tintColor: Color.Blue }}
                  onAction={() => onSetAudio(device, audioEndpoint)}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                />
              )}
            {device.isConnected && audioEndpoint?.isDefaultOutput && (
              <Action
                title="Already Default Audio Output"
                icon={{ source: Icon.SpeakerOn, tintColor: Color.Green }}
                onAction={() => {
                  /* already default — no-op shown for clarity */
                }}
              />
            )}

            <Action
              title="Remove Device"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              style={Action.Style.Destructive}
              onAction={() => onRemove(device)}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.RotateClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Toggle Bluetooth"
              icon={Icon.Bluetooth}
              onAction={onToggleBt}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
            <Action.CopyToClipboard
              title="Copy Device Id"
              content={device.id}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {device.deviceAddress && (
              <Action.CopyToClipboard
                title="Copy Mac Address"
                content={device.deviceAddress}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            <Action
              title="Open Bluetooth Settings"
              icon={Icon.Gear}
              onAction={() => open("ms-settings:bluetooth")}
              shortcut={{ modifiers: ["cmd"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
