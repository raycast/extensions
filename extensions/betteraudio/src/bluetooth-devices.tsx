import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listBluetooth } from "./lib/cli";
import { ErrorView } from "./components/ErrorView";

export default function Command() {
  const { data: devices, error, isLoading } = useCachedPromise(listBluetooth);

  if (error) return <ErrorView error={error} />;

  if (!isLoading && (!devices || devices.length === 0)) {
    return (
      <List>
        <List.EmptyView
          title="No Bluetooth Devices"
          description="No connected Bluetooth audio devices found."
          icon="🎧"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Bluetooth devices..."
    >
      {devices?.map((device) => {
        const accessories: List.Item.Accessory[] = [];

        if (device.isConnected) {
          accessories.push({ tag: { value: "Connected", color: "#34C759" } });
        }
        if (device.batteryLevel != null) {
          accessories.push({ text: `🔋 ${device.batteryLevel}%` });
        }

        return (
          <List.Item
            key={device.name}
            title={device.name}
            icon="🎧"
            accessories={accessories}
          />
        );
      })}
    </List>
  );
}
