import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { Device, scanDevices, pairDevice } from "./bluetooth";

export default function ScanDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastScanned, setLastScanned] = useState<Date | null>(null);

  const scan = useCallback(async () => {
    setIsLoading(true);
    const devs = await scanDevices();
    setDevices(devs);
    setLastScanned(new Date());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  async function handlePair(device: Device) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Pairing with ${device.name}…`,
      message: "Check the device for a PIN prompt",
    });
    const result = await pairDevice(device.id);
    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Paired successfully";
      toast.message = device.name;
      // Re-scan to reflect new state
      await scan();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Pairing failed";
      toast.message = result.error;
    }
  }

  const unpaired = devices.filter((d) => !d.isPaired);
  const subtitle = lastScanned
    ? `Last scanned at ${lastScanned.toLocaleTimeString()}`
    : undefined;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter nearby devices…"
      navigationTitle="Scan for Bluetooth Devices"
    >
      {!isLoading && unpaired.length === 0 && (
        <List.EmptyView
          icon={Icon.Bluetooth}
          title="No Nearby Devices Found"
          description={
            "Make sure the device is in pairing mode, then scan again.\n" +
            "Some devices must be in range and discoverable."
          }
          actions={
            <ActionPanel>
              <Action
                title="Scan Again"
                icon={Icon.RotateClockwise}
                onAction={scan}
              />
              <Action
                title="Open Bluetooth Settings"
                icon={Icon.Gear}
                onAction={() => open("ms-settings:bluetooth")}
              />
            </ActionPanel>
          }
        />
      )}

      {unpaired.length > 0 && (
        <List.Section title="Nearby Devices" subtitle={subtitle}>
          {unpaired.map((d) => (
            <List.Item
              key={d.id}
              icon={{ source: Icon.Bluetooth, tintColor: Color.Blue }}
              title={d.name}
              subtitle={d.deviceAddress}
              accessories={[
                { tag: { value: d.deviceKind, color: Color.SecondaryText } },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {d.canPair && (
                      <Action
                        title="Pair Device"
                        icon={{ source: Icon.Link, tintColor: Color.Green }}
                        onAction={() => handlePair(d)}
                      />
                    )}
                    {!d.canPair && (
                      <Action
                        title="Open Bluetooth Settings to Pair"
                        icon={Icon.Gear}
                        onAction={() => open("ms-settings:bluetooth")}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Scan Again"
                      icon={Icon.RotateClockwise}
                      onAction={scan}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Device Id"
                      content={d.id}
                    />
                    {d.deviceAddress && (
                      <Action.CopyToClipboard
                        title="Copy Mac Address"
                        content={d.deviceAddress}
                      />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
