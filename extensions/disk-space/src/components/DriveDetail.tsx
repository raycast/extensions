import React from "react";
import { List } from "@raycast/api";
import { StorageDrive } from "../types/storage";
import {
  formatBytes,
  formatExactBytes,
  formatPercent,
} from "../utils/formatters";
import { renderHighResMeter } from "../utils/meters";
import { getCategoryIcon, getHealthColor } from "../utils/colors";

export interface DriveDetailProps {
  drive: StorageDrive;
}

export function generateDriveMarkdown(drive: StorageDrive): string {
  const gauge = renderHighResMeter(drive.usagePercent, 16);
  const colorWord =
    drive.usagePercent >= 90
      ? "🔴 Critical"
      : drive.usagePercent >= 85
        ? "🟠 Warning"
        : drive.usagePercent >= 70
          ? "🟡 Moderate"
          : "🟢 Normal";

  const lines = [
    `# ${drive.displayName}`,
    `\`${gauge}\` **${formatPercent(drive.usagePercent)}** (${colorWord})`,
    "",
    "### Storage Breakdown",
    `- **Used Space**: ${formatBytes(drive.usedBytes)} (${formatExactBytes(drive.usedBytes)})`,
    `- **Free Space**: ${formatBytes(drive.freeBytes)} (${formatExactBytes(drive.freeBytes)})`,
    `- **Total Capacity**: ${formatBytes(drive.totalBytes)} (${formatExactBytes(drive.totalBytes)})`,
    "",
    "### Hardware & System Details",
    `- **File System**: ${drive.fileSystem}`,
    `- **Drive Category**: ${drive.driveTypeDescription}`,
    `- **Health Status**: ${drive.healthStatus}`,
    drive.model ? `- **Hardware Model**: ${drive.model}` : "",
    drive.busType ? `- **Bus Interface**: ${drive.busType}` : "",
    drive.networkPath ? `- **Network Path**: ${drive.networkPath}` : "",
    drive.isBitLockerEncrypted ? "- **Security**: BitLocker Encrypted" : "",
    drive.isReadOnly ? "- **Access**: Read-Only Volume" : "",
    drive.isSystemDrive ? "- **Role**: System Boot Volume" : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export function DriveDetail({ drive }: DriveDetailProps): JSX.Element {
  const markdown = generateDriveMarkdown(drive);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Drive Letter"
            text={drive.driveLetter || "N/A"}
          />
          <List.Item.Detail.Metadata.Label
            title="Volume Name"
            text={drive.volumeName}
          />
          <List.Item.Detail.Metadata.Label
            title="Mount Point"
            text={drive.mountPoint}
          />
          <List.Item.Detail.Metadata.TagList title="Category">
            <List.Item.Detail.Metadata.TagList.Item
              text={drive.driveTypeDescription}
              icon={getCategoryIcon(drive.category)}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Health Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={drive.healthStatus}
              color={getHealthColor(drive.healthStatus)}
            />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Used Space"
            text={`${formatBytes(drive.usedBytes)} (${formatPercent(drive.usagePercent)})`}
          />
          <List.Item.Detail.Metadata.Label
            title="Free Space"
            text={formatBytes(drive.freeBytes)}
          />
          <List.Item.Detail.Metadata.Label
            title="Total Capacity"
            text={formatBytes(drive.totalBytes)}
          />
          <List.Item.Detail.Metadata.Label
            title="Exact Capacity"
            text={formatExactBytes(drive.totalBytes)}
          />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="File System"
            text={drive.fileSystem}
          />
          <List.Item.Detail.Metadata.Label
            title="Bus Interface"
            text={drive.busType || "Standard"}
          />
          <List.Item.Detail.Metadata.Label
            title="Media Type"
            text={drive.mediaType || "Unspecified"}
          />
          <List.Item.Detail.Metadata.Label
            title="Hardware Model"
            text={drive.model || "Standard Storage Device"}
          />
          <List.Item.Detail.Metadata.Label
            title="System Drive"
            text={drive.isSystemDrive ? "Yes" : "No"}
          />
          <List.Item.Detail.Metadata.Label
            title="Removable Media"
            text={drive.isRemovable ? "Yes" : "No"}
          />
          <List.Item.Detail.Metadata.Label
            title="Read-Only"
            text={drive.isReadOnly ? "Yes" : "No"}
          />

          {drive.isBitLockerEncrypted !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="BitLocker"
              text={
                drive.isBitLockerEncrypted
                  ? "Encrypted"
                  : "Decrypted / Unencrypted"
              }
            />
          )}

          {drive.diskNumber !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="Disk / Partition"
              text={`Disk ${drive.diskNumber}, Partition ${drive.partitionNumber ?? "N/A"}`}
            />
          )}

          {drive.networkPath && (
            <List.Item.Detail.Metadata.Label
              title="Network Share"
              text={drive.networkPath}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
