import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import EmptyView from "./components/EmptyView";
import { getDevices, removeDevice } from "./lib/dcli";
import { Device } from "./types/dcli";

function DevicesCommand() {
  const { data, isLoading, revalidate, error } = usePromise(getDevices);
  const isEmpty = data?.length === 0;

  async function remove(id: string) {
    const confirmed = await confirmAlert({
      title: "Remove Device",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      message: "Devices that are removed from your account will need to re-authenticate to Dashlane again.",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      title: "Removing Device",
      style: Toast.Style.Animated,
    });
    await removeDevice(id);
    await revalidate();
    toast.title = "Device removed";
    toast.style = Toast.Style.Success;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Manage your devices"
      searchBarPlaceholder="Search your devices"
    >
      {data?.map((device) => <ListItemDevice key={device.deviceId} {...device} onRemove={remove} />)}
      <EmptyView isEmpty={isEmpty} isError={!!error} isLoading={isLoading} syncAction={<></>} />
    </List>
  );
}

export default DevicesCommand;

function ListItemDevice({
  deviceId,
  deviceName,
  devicePlatform,
  lastActivityDateUnix,
  creationDateUnix,
  isCurrentDevice,
  lastUpdateDateUnix,
  onRemove,
}: Device & { onRemove: (id: string) => void }) {
  const icon = getDeviceIcon(devicePlatform);

  return (
    <List.Item
      key={deviceId}
      title={deviceName ?? ""}
      icon={icon}
      keywords={[icon.tooltip, deviceId]}
      accessories={
        isCurrentDevice ? [{ icon: { source: Icon.Dot, tintColor: Color.Green }, tooltip: "Current" }] : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Remove Device"
            style={Action.Style.Destructive}
            icon={Icon.Trash}
            onAction={() => onRemove(deviceId)}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="ID" text={deviceId} />
              <List.Item.Detail.Metadata.Label title="Created " text={getFormattedDateFromEpoch(creationDateUnix)} />
              <List.Item.Detail.Metadata.Label
                title="Last Update"
                text={getFormattedDateFromEpoch(lastUpdateDateUnix)}
              />
              <List.Item.Detail.Metadata.Label
                title="Last Activity"
                text={getFormattedDateFromEpoch(lastActivityDateUnix)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function getDeviceIcon(platform: string = "") {
  if (platform === "server_standalone") {
    return {
      value: Icon.Monitor,
      tooltip: "Standalone",
    };
  }

  if (platform === "server_cli") {
    return {
      value: Icon.CodeBlock,
      tooltip: "CLI",
    };
  }

  const [, device] = platform.split("_");
  return {
    value: Icon.Mobile,
    tooltip: device,
  };
}

export const getFormattedDateFromEpoch = (epochSeconds: number): string => {
  try {
    const date = new Date(epochSeconds * 1000);
    return Intl.DateTimeFormat("en-uk", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};
