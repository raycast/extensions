import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { fetchDeviceDetails, Device } from "./pdq-api";
import { PackageSelector } from "./PackageSelector";
import { getStoredOrgName } from "./store-secret";

interface DeviceDetailsProps {
  deviceId: string;
}

export function DeviceDetails({ deviceId }: DeviceDetailsProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [consoleUrl, setConsoleUrl] = useState<string>("");

  useEffect(() => {
    async function loadDeviceDetails() {
      try {
        const deviceData = await fetchDeviceDetails(deviceId);
        setDevice(deviceData);
      } catch (error) {
        console.error("Error loading device details:", error);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchOrgName() {
      const orgName = await getStoredOrgName();
      if (orgName) {
        setConsoleUrl(`https://app.pdq.com/${orgName}/devices/${deviceId}/info`);
      }
    }

    loadDeviceDetails();
    fetchOrgName();
  }, [deviceId]);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!device) {
    return (
      <List>
        <List.EmptyView title="Error: Device information not available." />
      </List>
    );
  }

  const generalInfoMetadata = {
    Hostname: device.hostname || "N/A",
    ID: device.id || "N/A",
    Architecture: device.architecture || "N/A",
    Model: device.model || "N/A",
    "Serial Number": device.serialNumber || "N/A",
    "Last User": device.lastUser || "N/A",
    "Service Pack": device.servicePack || "N/A",
    "OS Version": device.osVersion || "N/A",
    "IP Address": device.publicIpAddress || "N/A",
    "Date Added": device.insertedAt ? new Date(device.insertedAt).toLocaleString() : "N/A",
  };

  const universalActionPanel = (
    <ActionPanel>
      {device.id && (
        <Action.Push
          title="Deploy Package"
          target={<PackageSelector deviceId={device.id} onDeploymentCreated={() => {}} />}
          icon={Icon.Box}
        />
      )}
      {consoleUrl && <Action.OpenInBrowser title="View device in browser" url={consoleUrl} icon={Icon.Globe} />}
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail
      navigationTitle={`Device Details: ${device.name || device.hostname || "Unknown Device"}`}
      searchBarPlaceholder="Search sections..."
    >
      <List.Item
        icon={Icon.Info}
        title="General Info"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Device Information" />
                {Object.entries(generalInfoMetadata).map(([key, value]) => (
                  <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />
                ))}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Total Properties"
                  text={Object.keys(generalInfoMetadata).length.toString()}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={universalActionPanel}
      />
      <List.Item
        icon={Icon.List}
        title="Custom Fields"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Custom Fields" />
                {device.customFields && device.customFields.length > 0 ? (
                  device.customFields.map((field, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={index}
                      title={field.name.length > 25 ? `${field.name.slice(0, 22)}...` : field.name}
                      text={
                        field.value
                          ? field.value.toString().length > 30
                            ? `${field.value.toString().slice(0, 27)}...`
                            : field.value.toString()
                          : "N/A"
                      }
                    />
                  ))
                ) : (
                  <List.Item.Detail.Metadata.Label title="No custom fields available" text="-" />
                )}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Total Custom Fields"
                  text={(device.customFields?.length || 0).toString()}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={universalActionPanel}
      />
      <List.Item
        icon={Icon.AppWindow}
        title="Software"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Installed Software" />
                {device.software && device.software.length > 0 ? (
                  device.software
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((sw, index) => (
                      <List.Item.Detail.Metadata.Label
                        key={index}
                        title={sw.name.length > 30 ? `${sw.name.slice(0, 27)}...` : sw.name}
                        text={sw.versionRaw}
                      />
                    ))
                ) : (
                  <List.Item.Detail.Metadata.Label title="No software information available" text="-" />
                )}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Total Software"
                  text={(device.software?.length || 0).toString()}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={universalActionPanel}
      />
    </List>
  );
}
