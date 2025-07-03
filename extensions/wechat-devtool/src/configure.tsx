import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { getCurrentDeviceName, getAllDeviceConfigs, saveConfig } from "./utils/config";
import DeviceForm from "./components/device-form";
import ReadmeView from "./readme-view";
import { ExtensionConfig } from "./types";

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
      const config = getAllDeviceConfigs();
      setDevices(config);
    } catch (error) {
      console.error("Failed to load devices:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Load Failed",
        message: "Unable to load configuration",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddDevice() {
    push(
      <DeviceForm
        initialData={{
          cliPath: "/Applications/wechatwebdevtools.app/Contents/MacOS/cli",
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
      saveConfig(updatedDevices);

      await showToast({
        style: Toast.Style.Success,
        title: "Delete Successful",
        message: `Deleted configuration for "${deviceConfig.name}"`,
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
          <Action title="Readme" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
        </ActionPanel>
      }
    >
      {Object.entries(devices).map(([deviceId, deviceConfig]) => (
        <List.Item
          key={deviceId}
          icon={Icon.Devices}
          title={deviceConfig.name}
          subtitle={`${deviceConfig.projects.length} projects`}
          accessories={
            deviceConfig.name === getCurrentDeviceName()
              ? [
                  {
                    text: "Current Device",
                    icon: Icon.Info,
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <Action title="Edit Configuration" icon={Icon.Pencil} onAction={() => handleEditDevice(deviceId)} />
              <Action
                title="Add Configuration"
                icon={Icon.Plus}
                onAction={handleAddDevice}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Delete Configuration"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteDevice(deviceId)}
              />
              <Action title="Readme" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
            </ActionPanel>
          }
        />
      ))}

      {Object.keys(devices).length === 0 && (
        <List.EmptyView
          icon={Icon.Devices}
          title="No Project Configurations Added"
          description="Configure project settings for different devices"
          actions={
            <ActionPanel>
              <Action
                title="Add Project Configuration"
                icon={Icon.Plus}
                onAction={handleAddDevice}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action title="Readme" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
