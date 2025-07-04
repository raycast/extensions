import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, useNavigation, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCurrentDeviceName, getAllDeviceConfigs, saveConfig } from "./utils/config";
import DeviceForm from "./components/device-form";
import ReadmeView from "./readme-view";
import { ExtensionConfig } from "./types";
import { WECHAT_DEVTOOL_CLI_PATH } from "./constants";

export default function Configure() {
  const [devices, setDevices] = useState<ExtensionConfig>({});
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      setIsLoading(true);
      const config = await getAllDeviceConfigs();
      setDevices(config);
    } catch (error) {
      console.error("Failed to load devices:", error);
      await showFailureToast(error, { title: "Failed to Load", message: "Could not load configuration" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddDevice() {
    push(
      <DeviceForm
        initialData={{
          cliPath: WECHAT_DEVTOOL_CLI_PATH,
          projects: [],
        }}
        onSuccess={loadDevices}
      />,
    );
  }

  async function handleEditDevice(deviceId: string) {
    const deviceConfig = devices[deviceId];
    if (!deviceConfig) return;
    push(
      <DeviceForm
        initialData={{
          id: deviceId,
          name: deviceConfig.name,
          cliPath: deviceConfig.cliPath,
          projects: deviceConfig.projects,
        }}
        onSuccess={loadDevices}
      />,
    );
  }

  async function handleDeleteDevice(deviceId: string) {
    const deviceConfig = devices[deviceId];
    if (!deviceConfig) return;

    const confirmed = await confirmAlert({
      title: "Delete Configuration",
      message: `Are you sure you want to delete "${deviceConfig.name}" and its project configuration? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (confirmed) {
      const updatedDevices = { ...devices };
      delete updatedDevices[deviceId];
      setDevices(updatedDevices);
      await saveConfig(updatedDevices);

      await showToast({
        style: Toast.Style.Success,
        title: "Configuration Deleted",
        message: `Deleted "${deviceConfig.name}" configuration`,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search configurations..."
      actions={
        <ActionPanel>
          <Action
            title="Add Configuration"
            icon={Icon.Plus}
            onAction={handleAddDevice}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action title="About This Extension" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
        </ActionPanel>
      }
    >
      {Object.entries(devices).map(([deviceId, deviceConfig]) => (
        <List.Item
          key={deviceId}
          icon={Icon.Devices}
          title={deviceConfig.name}
          subtitle={`${deviceConfig.projects.length} projects`}
          accessories={deviceConfig.name === getCurrentDeviceName() ? [{ text: "Current Device" }] : []}
          actions={
            <ActionPanel>
              <Action title="Edit Configuration" icon={Icon.Pencil} onAction={() => handleEditDevice(deviceId)} />
              <Action
                title="Add Configuration"
                icon={Icon.Plus}
                onAction={handleAddDevice}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action title="About This Extension" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
              <Action
                title="Delete Configuration"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteDevice(deviceId)}
              />
            </ActionPanel>
          }
        />
      ))}

      {Object.keys(devices).length === 0 && (
        <List.EmptyView
          icon={Icon.Devices}
          title="No Configurations"
          description="Configure project settings for different devices"
          actions={
            <ActionPanel>
              <Action
                title="Add Configuration"
                icon={Icon.Plus}
                onAction={handleAddDevice}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action title="About This Extension" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
