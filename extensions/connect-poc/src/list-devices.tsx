/* eslint-disable @raycast/prefer-title-case */
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { makeApiRequest, Device } from "./pdq-api";
import { DeviceDetails } from "./DeviceDetails";
import { PackageSelector } from "./PackageSelector";
import { getStoredOrgName } from "./store-secret";

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orgName, setOrgName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        const [fetchedDevices, storedOrgName] = await Promise.all([
          makeApiRequest<Device[]>("devices"),
          getStoredOrgName(),
        ]);

        if (Array.isArray(fetchedDevices.data)) {
          setDevices(fetchedDevices.data);
        } else {
          console.error("Fetched devices is not an array:", fetchedDevices);
          setError("Error fetching devices");
        }

        setOrgName(storedOrgName || "your organization");
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load devices",
          message: err instanceof Error ? err.message : "An unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={error} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Seach Devices"
      searchBarPlaceholder={`Search devices in ${orgName}...`}
    >
      {devices.map((device) => (
        <List.Item
          key={device.id}
          icon={Icon.Devices}
          title={device.name || "Unnamed Device"}
          subtitle={device.hostname || "No hostname"}
          accessories={[{ text: device.osVersion || "Unknown OS" }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Device Details" target={<DeviceDetails deviceId={device.id} />} />
              <Action.CopyToClipboard title="Copy Device ID" content={device.id} />
              <Action.Push
                title="Deploy Package"
                target={
                  <PackageSelector
                    deviceId={device.id}
                    onDeploymentCreated={() => {
                      console.log("Deployment created successfully");
                    }}
                  />
                }
                icon={Icon.Box}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
