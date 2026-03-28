import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listDevices, setDevice } from "./lib/cli";
import { formatTransportType } from "./lib/constants";
import { ErrorView } from "./components/ErrorView";
import type { CLIDeviceInfo } from "./lib/types";

export default function Command() {
  const {
    data: devices,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => listDevices());

  if (error) return <ErrorView error={error} />;

  const outputDevices = devices?.filter((d) => d.isOutput) ?? [];
  const inputDevices = devices?.filter((d) => d.isInput) ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      <List.Section title="Output Devices" subtitle={`${outputDevices.length}`}>
        {outputDevices.map((device) => (
          <DeviceItem
            key={device.uid}
            device={device}
            direction="output"
            onSet={revalidate}
          />
        ))}
      </List.Section>
      <List.Section title="Input Devices" subtitle={`${inputDevices.length}`}>
        {inputDevices.map((device) => (
          <DeviceItem
            key={device.uid}
            device={device}
            direction="input"
            onSet={revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function DeviceItem({
  device,
  direction,
  onSet,
}: {
  device: CLIDeviceInfo;
  direction: "output" | "input";
  onSet: () => void;
}) {
  const connectionType = formatTransportType(device.transportType);
  const accessories: List.Item.Accessory[] = [];

  if (connectionType) {
    accessories.push({ text: connectionType });
  }
  if (device.isDefault) {
    accessories.push({ tag: { value: "Default", color: "#34C759" } });
  }

  return (
    <List.Item
      title={device.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          {!device.isDefault && (
            <Action
              title={`Set as Default ${direction === "output" ? "Output" : "Input"}`}
              icon={Icon.CheckCircle}
              onAction={async () => {
                try {
                  const msg = await setDevice(device.uid, direction);
                  await showToast({ style: Toast.Style.Success, title: msg });
                  onSet();
                } catch (err) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to set device",
                    message: err instanceof Error ? err.message : String(err),
                  });
                }
              }}
            />
          )}
          <Action
            title="Copy UID"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(device.uid);
              await showHUD("📋 UID copied");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
