import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getStatus } from "./utils/applescript";
import React from "react";

export default function Command() {
  const { data: status, isLoading, error, revalidate } = usePromise(getStatus);

  if (error) {
    return (
      <Detail
        markdown={`# ⚠️ Error\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={revalidate} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!status) {
    return (
      <Detail
        markdown="# 📱 No Device Connected\n\nNo device is currently connected to AirSync."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `
# 📱 ${status.device_name}

## Connection Details

| Property | Value |
|----------|-------|
| **Device Name** | ${status.device_name} |
| **IP Address** | ${status.device_ip} |
| **Port** | ${status.device_port} |
| **ADB Connected** | ${status.adb_connected === "true" ? "✅ Yes" : "❌ No"} |
| **Notifications** | ${status.notifications_count} |
| **Device Version** | ${status.device_version} |
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Device" text={status.device_name} icon={Icon.Mobile} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="IP Address" text={status.device_ip} icon={Icon.Network} />
          <Detail.Metadata.Label title="Port" text={status.device_port} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="ADB Status"
            text={status.adb_connected === "true" ? "Connected" : "Disconnected"}
            icon={status.adb_connected === "true" ? Icon.CheckCircle : Icon.XMarkCircle}
          />
          <Detail.Metadata.Label title="Notifications" text={status.notifications_count} icon={Icon.Bell} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Version" text={status.device_version} icon={Icon.Info} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
          <Action.CopyToClipboard title="Copy IP Address" content={status.device_ip} />
        </ActionPanel>
      }
    />
  );
}
