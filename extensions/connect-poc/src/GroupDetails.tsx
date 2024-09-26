// group-details.tsx
import { Detail, List, ActionPanel, Action, Icon, useNavigation, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { Group, Device, makeApiRequest } from "./pdq-api";
import { PackageSelector } from "./PackageSelector";

export function GroupDetails({ group }: { group: Group }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetchGroupDevices() {
      try {
        setIsLoading(true);
        const response = await makeApiRequest<Device>(`devices?group=${group.id}`);
        if (Array.isArray(response.data)) {
          setDevices(response.data);
        } else {
          console.error("Unexpected response structure for devices:", response);
        }
      } catch (error) {
        console.error("Error fetching group devices:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGroupDevices();
  }, [group.id]);

  const markdown = `
  # ${group.name}

  - **Type:** ${group.type}
  - **Source:** ${group.source}
  - **Created:** ${new Date(group.insertedAt).toLocaleString()}
  - **ID:** ${group.id}

## Devices in group
${
  devices.length > 0
    ? devices.map((device) => `- ${device.name || device.hostname || "Unnamed Device"}`).join("\n")
    : "No devices in group"
}
`;

  function getSourceColor(source: string): Color {
    switch (source.toLowerCase()) {
      case "pdq":
        return Color.Green;
      case "custom":
        return Color.SecondaryText;
      default:
        return Color.Purple; // You can choose a different color for other sources if needed
    }
  }

  function formatSource(source: string): string {
    if (source.toLowerCase() === "pdq") return "PDQ";
    if (source.toLowerCase() === "custom") return "Custom";
    return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
  }

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={group.type} />
          <Detail.Metadata.TagList title="Source">
            <Detail.Metadata.TagList.Item text={formatSource(group.source)} color={getSourceColor(group.source)} />
          </Detail.Metadata.TagList>{" "}
          <Detail.Metadata.Label title="Device Count" text={devices.length.toString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Deploy Package"
            target={
              <PackageSelector
                groupId={group.id}
                onDeploymentCreated={() => {
                  console.log("Deployment created successfully");
                }}
              />
            }
            icon={Icon.Box}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action.CopyToClipboard title="Copy Group ID" content={group.id} />
          <Action title="Go Back" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "[" }} />
        </ActionPanel>
      }
    >
      <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
        {devices.map((device) => (
          <DeviceListItem key={device.id} device={device} />
        ))}
      </List>
    </Detail>
  );
}

function DeviceListItem({ device }: { device: Device }) {
  return (
    <List.Item
      title={device.name || device.hostname || "Unnamed Device"}
      subtitle={device.id}
      accessories={[{ text: device.publicIpAddress || "No IP" }, { icon: Icon.Computer }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Device ID" content={device.id} />
          <Action.CopyToClipboard
            title="Copy Device Name"
            content={device.name || device.hostname || "Unnamed Device"}
          />
          <Action.Push
            title="Deploy Package"
            target={
              <PackageSelector
                groupId={group.id}
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
  );
}
