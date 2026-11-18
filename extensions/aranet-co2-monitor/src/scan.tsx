import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { scanForDevices } from "swift:../swift";

export default function Command() {
  const { data, isLoading } = usePromise(scanForDevices, []);

  const handleSelectDevice = async (deviceId: string) => {
    await LocalStorage.setItem("cached_device_uuid", deviceId);
    await showToast({
      style: Toast.Style.Success,
      title: "Device Cached",
      message: "This device has been selected",
    });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Scanning for devices...">
      {data?.map((device) => (
        <List.Item
          key={device.id}
          icon={Icon.Mobile}
          title={device.name}
          subtitle={`RSSI: ${device.rssi}`}
          accessories={[{ text: device.id }]}
          actions={
            <ActionPanel>
              <Action title="Select Device" icon={Icon.Check} onAction={() => handleSelectDevice(device.id)} />
              <Action.CopyToClipboard title="Copy Id" content={device.id} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && data?.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Devices Found"
          description="Make sure your Aranet device is connected via the Aranet Home App."
        />
      )}
    </List>
  );
}
