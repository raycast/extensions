import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { discoverBooxDevices } from "../discovery/discover";
import { writeCachedDevice } from "../discovery/device-cache";
import { useQuery } from "../hooks/use-query";
import { getBooxPreferences } from "../lib/preferences";

export function DevicesView(props: { onSelected: () => void }) {
  const { pop } = useNavigation();
  const preferences = getBooxPreferences();
  const query = useQuery("discover-all-devices", () =>
    discoverBooxDevices(Boolean(preferences.scanVirtualInterfaces), preferences.password)
  );
  return (
    <List isLoading={query.isLoading} navigationTitle="BOOX Devices">
      {!query.isLoading && !query.data?.length ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="No BOOX Devices Found"
          description="Open BOOXDrop and keep the device on the same local network."
          actions={
            <ActionPanel>
              <Action title="Search Again" icon={Icon.ArrowClockwise} onAction={query.revalidate} />
              <Action title="Enter Address Manually" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}
      {query.data?.map(({ device }) => (
        <List.Item
          key={device.id}
          icon={device.screenAvailable ? Icon.Devices : Icon.Mobile}
          title={device.nickname || device.model}
          subtitle={device.host}
          accessories={[{ text: device.screenAvailable ? "Screen available" : "BOOXDrop" }]}
          actions={
            <ActionPanel>
              {preferences.manualHost?.trim() ? (
                <Action title="Edit Manual Device Address" icon={Icon.Gear} onAction={openExtensionPreferences} />
              ) : (
                <Action
                  title="Use This Device"
                  icon={Icon.CheckCircle}
                  onAction={async () => {
                    await writeCachedDevice(device);
                    await showToast({ style: Toast.Style.Success, title: `${device.model} Is Now the Default` });
                    props.onSelected();
                    pop();
                  }}
                />
              )}
              <Action.CopyToClipboard title="Copy Device Address" content={device.host} />
              <Action title="Search Again" icon={Icon.ArrowClockwise} onAction={query.revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
