import React from "react";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { StorageDrive } from "../types/storage";
import {
  openDriveRoot,
  openInTerminal,
  launchDiskCleanup,
  openStorageSense,
  safelyEjectDrive,
  copyDriveSummary,
  copyDriveJson,
} from "../actions/power-actions";

export interface DriveActionPanelProps {
  drive: StorageDrive;
  isShowingDetail?: boolean;
  onToggleDetail?: () => void;
  onRefresh?: () => void;
  onEject?: () => void;
}

export function DriveActionPanel({
  drive,
  isShowingDetail = false,
  onToggleDetail,
  onRefresh,
  onEject,
}: DriveActionPanelProps): JSX.Element {
  const isMac = process.platform === "darwin";
  const exploreTitle = isMac ? "Open in Finder" : "Open in File Explorer";
  const cleanupTitle = isMac
    ? "Open macOS Storage Management"
    : "Launch Windows Disk Cleanup";

  return (
    <ActionPanel title={drive.displayName}>
      {/* 1. Explore & Access */}
      <ActionPanel.Section title="Explore & Access">
        <Action
          title={exploreTitle}
          icon={Icon.Finder}
          onAction={() => openDriveRoot(drive.mountPoint)}
        />
        <Action
          title="Open in Terminal"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => openInTerminal(drive.mountPoint)}
        />
      </ActionPanel.Section>

      {/* 2. Storage Utilities & Maintenance */}
      <ActionPanel.Section title="Storage Utilities">
        <Action
          title={cleanupTitle}
          icon={Icon.Trash}
          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
          onAction={() => launchDiskCleanup(drive.driveLetter)}
        />
        <Action
          title="Open Storage Settings"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={openStorageSense}
        />
      </ActionPanel.Section>

      {/* 3. Removable Hardware Controls */}
      {drive.isRemovable && !drive.isSystemDrive && (
        <ActionPanel.Section title="Removable Hardware">
          <Action
            title="Safely Eject Drive"
            icon={Icon.Eject}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => safelyEjectDrive(drive, onEject)}
          />
        </ActionPanel.Section>
      )}

      {/* 4. Copy Information */}
      <ActionPanel.Section title="Copy Information">
        <Action.CopyToClipboard
          title="Copy Mount Path"
          content={drive.mountPoint}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action
          title="Copy Drive Summary"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={() => copyDriveSummary(drive)}
        />
        <Action
          title="Copy JSON Metadata"
          icon={Icon.Code}
          shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
          onAction={() => copyDriveJson(drive)}
        />
      </ActionPanel.Section>

      {/* 5. View & Navigation */}
      <ActionPanel.Section title="View & Refresh">
        {onToggleDetail && (
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
        )}
        {onRefresh && (
          <Action
            title="Refresh Storage List"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
