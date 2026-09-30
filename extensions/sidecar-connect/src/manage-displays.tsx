import { useEffect } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast, open } from "@raycast/api";
import { useDisplays, DisplayItem } from "./hooks/useDisplays";
import { connectDevice, disconnectDevice } from "./lib/swift-bridge";
import { markConnected, toggleFavorite, removeFromHistory } from "./lib/display-store";

export default function ManageDisplays() {
  const { connected, available, history, isLoading, error, rescan, refreshStored } = useDisplays();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to discover devices",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      {connected.length > 0 && (
        <List.Section title="Connected">
          {connected.map((device) => (
            <DeviceItem key={device.id} device={device} onAction={rescan} onStoredChange={refreshStored} />
          ))}
        </List.Section>
      )}

      {available.length > 0 && (
        <List.Section title="Available">
          {available.map((device) => (
            <DeviceItem key={device.id} device={device} onAction={rescan} onStoredChange={refreshStored} />
          ))}
        </List.Section>
      )}

      {history.length > 0 && (
        <List.Section title="Recently Used">
          {history.map((device) => (
            <DeviceItem key={device.id} device={device} onAction={rescan} onStoredChange={refreshStored} />
          ))}
        </List.Section>
      )}

      {!isLoading && connected.length === 0 && available.length === 0 && history.length === 0 && (
        <List.EmptyView
          title="No Sidecar Devices Found"
          description="Make sure your iPad is nearby with Wi-Fi and Bluetooth enabled, and both devices are signed into the same Apple ID."
          icon={Icon.Monitor}
        />
      )}
    </List>
  );
}

function DeviceItem({
  device,
  onAction,
  onStoredChange,
}: {
  device: DisplayItem;
  onAction: () => void;
  onStoredChange: () => void;
}) {
  const statusTag = device.isConnected
    ? { value: "Connected", color: Color.Green }
    : device.source === "live"
      ? { value: "Available", color: Color.Yellow }
      : { value: "Offline", color: Color.SecondaryText };

  const accessories: List.Item.Accessory[] = [{ tag: statusTag }];
  if (device.isFavorite) {
    accessories.unshift({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }
  if (device.lastConnected) {
    accessories.push({ date: new Date(device.lastConnected), tooltip: "Last connected" });
  }

  return (
    <List.Item
      icon={device.isConnected ? { source: Icon.Monitor, tintColor: Color.Green } : Icon.Monitor}
      title={device.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {device.isConnected ? (
              <Action
                title="Disconnect"
                icon={Icon.XMarkCircle}
                onAction={async () => {
                  const toast = await showToast({ style: Toast.Style.Animated, title: "Disconnecting..." });
                  try {
                    await disconnectDevice(device.name);
                    toast.style = Toast.Style.Success;
                    toast.title = `Disconnected from ${device.name}`;
                    onAction();
                  } catch (err) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Disconnect failed";
                    toast.message = err instanceof Error ? err.message : String(err);
                  }
                }}
              />
            ) : (
              <Action
                title={device.source === "history" ? "Reconnect" : "Connect"}
                icon={Icon.Link}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: `Connecting to ${device.name}...`,
                  });
                  try {
                    await connectDevice(device.name);
                    await markConnected(device.id, device.name);
                    toast.style = Toast.Style.Success;
                    toast.title = `Connected to ${device.name}`;
                    onAction();
                  } catch (err) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Connection failed";
                    toast.message = err instanceof Error ? err.message : String(err);
                  }
                }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={device.isFavorite ? "Remove from Favorites" : "Set as Favorite"}
              icon={device.isFavorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={async () => {
                const isFav = await toggleFavorite(device.id, device.name);
                await showToast({
                  style: Toast.Style.Success,
                  title: isFav ? `${device.name} set as favorite` : `${device.name} removed from favorites`,
                });
                onStoredChange();
              }}
            />

            <Action
              title="Refresh Devices"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onAction}
            />

            <Action
              title="Open Display Settings"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              onAction={() => open("x-apple.systempreferences:com.apple.Displays-Settings.extension")}
            />
          </ActionPanel.Section>

          {device.source === "history" && (
            <ActionPanel.Section>
              <Action
                title="Remove from History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  await removeFromHistory(device.id);
                  await showToast({ style: Toast.Style.Success, title: `Removed ${device.name} from history` });
                  onStoredChange();
                }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
