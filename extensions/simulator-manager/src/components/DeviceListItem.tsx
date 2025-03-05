import { ActionPanel, Action, List, Icon, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Device } from "../types";
import { getDeviceTypeIcon, getStatusIcon, getStatusLabel, getStatusColor } from "../utils/device-utils";
import {
  executeSimulatorCommand,
  openSimulator,
  startAndroidEmulator,
  stopAndroidEmulator,
  openAndroidEmulator,
} from "../utils/simulator-commands";

interface DeviceListItemProps {
  device: Device;
  onRefresh: () => void;
}

export function DeviceListItem({ device, onRefresh }: DeviceListItemProps) {
  // Format the version based on device category
  let formattedVersion = device.runtime;

  if (device.category === "ios") {
    // Extract iOS version from runtime (e.g., "iOS-17-0" -> "iOS 17.0")
    formattedVersion = device.runtime
      .replace("iOS-", "iOS ")
      .replace(/-/g, ".")
      .replace("tvOS-", "tvOS ")
      .replace("watchOS-", "watchOS ");
  }
  // For Android, the version is already formatted in fetchAndroidDevices

  return (
    <List.Item
      key={device.id}
      icon={getDeviceTypeIcon(device.deviceType)}
      title={device.name}
      subtitle={device.deviceType}
      accessories={[
        {
          text: formattedVersion,
          tooltip: `Version: ${formattedVersion}`,
        },
        {
          icon: { source: getStatusIcon(device.status), tintColor: getStatusColor(device.status) },
          text: { value: getStatusLabel(device.status), color: getStatusColor(device.status) },
          tooltip: `Status: ${device.status}`,
        },
      ]}
      actions={
        <ActionPanel>
          {/* iOS Device Actions */}
          {device.category === "ios" && (
            <>
              {device.status !== "Booted" && (
                <Action
                  title="Boot Simulator"
                  icon={Icon.Play}
                  onAction={async () => {
                    try {
                      await executeSimulatorCommand("boot", device.id, "Simulator booted successfully");
                      onRefresh();
                    } catch (error) {
                      showFailureToast(error);
                    }
                  }}
                />
              )}
              {device.status === "Booted" && (
                <Action
                  title="Shutdown Simulator"
                  icon={Icon.Stop}
                  onAction={async () => {
                    try {
                      await executeSimulatorCommand("shutdown", device.id, "Simulator shut down successfully");
                      onRefresh();
                    } catch (error) {
                      showFailureToast(error);
                    }
                  }}
                />
              )}
              <Action
                title="Open Simulator"
                icon={Icon.Eye}
                onAction={async () => {
                  try {
                    await openSimulator(device.id);
                    onRefresh();
                  } catch (error) {
                    showFailureToast(error);
                  }
                }}
              />
            </>
          )}

          {/* Android Device Actions */}
          {device.category === "android" && (
            <>
              {device.status !== "Booted" && (
                <Action
                  title="Boot Emulator"
                  icon={Icon.Play}
                  onAction={async () => {
                    try {
                      await startAndroidEmulator(device.id);
                      onRefresh();
                    } catch (error) {
                      showFailureToast(error);
                    }
                  }}
                />
              )}
              {device.status === "Booted" && (
                <Action
                  title="Shutdown Emulator"
                  icon={Icon.Stop}
                  onAction={async () => {
                    try {
                      await stopAndroidEmulator(device.id);
                      onRefresh();
                    } catch (error) {
                      showFailureToast(error);
                    }
                  }}
                />
              )}
              <Action
                title="Open Emulator"
                icon={Icon.Eye}
                onAction={() => {
                  openAndroidEmulator(device.id);
                  onRefresh();
                }}
              />
            </>
          )}

          {/* Common Actions */}
          <Action
            title="Refresh Devices"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.CopyToClipboard title="Copy Device Id" content={device.id} />

          {/* Settings Action */}
          <Action
            title="Configure Android Sdk Path"
            icon={Icon.Gear}
            onAction={() => openExtensionPreferences()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
        </ActionPanel>
      }
    />
  );
}
