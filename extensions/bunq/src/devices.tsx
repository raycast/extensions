/**
 * Device Management command for viewing and managing registered API devices.
 */

import { Action, ActionPanel, List, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { getDevices, deleteDevice, DeviceServer } from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { useCallback } from "react";
import { ErrorView } from "./components";
import { getErrorMessage } from "./lib/errors";
import { copyToClipboard } from "./lib/actions";
import { getDeviceStatusAppearance } from "./lib/status-helpers";

// ============== Helpers ==============

function getDeviceDescription(device: DeviceServer): string {
  return device.description || "Unknown Device";
}

function getDeviceIp(device: DeviceServer): string {
  return device.ip || "*";
}

// ============== Main Component ==============

export default function DevicesCommand() {
  const session = useBunqSession();

  const {
    data: devices,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (): Promise<DeviceServer[]> => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () => getDevices(session.userId!, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const handleDelete = useCallback(
    async (device: DeviceServer) => {
      const confirmed = await confirmAlert({
        title: "Delete Device",
        message: `Are you sure you want to delete the device "${getDeviceDescription(device)}"?\n\nIP: ${getDeviceIp(device)}\n\nThe device will no longer be able to access your bunq account via the API.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting device..." });

        await withSessionRefresh(session, () => deleteDevice(device.id, session.getRequestOptions()));

        await showToast({ style: Toast.Style.Success, title: "Device deleted" });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete device",
          message: getErrorMessage(error),
        });
      }
    },
    [session, revalidate],
  );

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || error) {
    return (
      <ErrorView
        title="Error Loading Devices"
        message={getErrorMessage(session.error || error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  // Sort devices by creation date (newest first)
  const sortedDevices = devices
    ? [...devices].sort((a, b) => {
        if (!a.created || !b.created) return 0;
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      })
    : [];

  return (
    <List isLoading={isLoading} navigationTitle="Devices">
      {sortedDevices.length > 0 ? (
        <List.Section title={`Registered Devices (${sortedDevices.length})`}>
          {sortedDevices.map((device) => {
            const description = getDeviceDescription(device);
            const ip = getDeviceIp(device);
            const statusAppearance = getDeviceStatusAppearance(device.status || "ACTIVE");

            return (
              <List.Item
                key={device.id}
                title={description}
                subtitle={ip === "*" ? "All IPs" : `IP: ${ip}`}
                icon={{ source: Icon.Mobile, tintColor: statusAppearance.color }}
                accessories={[
                  { tag: { value: statusAppearance.label, color: statusAppearance.color } },
                  ...(device.created ? [{ date: new Date(device.created), tooltip: "Created" }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Copy Description"
                      icon={Icon.Clipboard}
                      onAction={() => copyToClipboard(description, "device description")}
                    />
                    {ip !== "*" && (
                      <Action
                        title="Copy IP Address"
                        icon={Icon.Clipboard}
                        onAction={() => copyToClipboard(ip, "IP address")}
                      />
                    )}
                    <Action
                      title="Delete Device"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                      onAction={() => handleDelete(device)}
                    />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.Mobile}
          title="No Devices"
          description="No API devices are registered. This extension should have created at least one device during setup."
        />
      )}
    </List>
  );
}
