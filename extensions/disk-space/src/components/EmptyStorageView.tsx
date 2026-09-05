import React from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { DriveTypeFilter } from "../types/storage";
import { launchDiskCleanup, openStorageSense } from "../actions/power-actions";

export interface EmptyStorageViewProps {
  title?: string;
  description?: string;
  icon?: Icon;
  filter?: DriveTypeFilter;
  searchText?: string;
  isLoading?: boolean;
  error?: Error;
  onRefresh: () => void;
  onResetFilter?: () => void;
}

export function EmptyStorageView({
  title,
  description,
  icon,
  filter = "all",
  searchText = "",
  isLoading = false,
  error,
  onRefresh,
  onResetFilter,
}: EmptyStorageViewProps): JSX.Element {
  if (error) {
    return (
      <List.EmptyView
        icon={icon || Icon.ExclamationMark}
        title={title || "Unable to Load Storage Drives"}
        description={
          description ||
          `${error.message || "An error occurred while querying system storage."} Please ensure permissions are granted and retry.`
        }
        actions={
          <ActionPanel>
            <Action
              title="Retry Scan"
              icon={Icon.RotateClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Open Storage Settings"
              icon={Icon.Gear}
              onAction={openStorageSense}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const isFiltered = filter !== "all" || searchText.trim().length > 0;

  if (isFiltered) {
    const filterDesc =
      filter !== "all"
        ? `No drives matching category "${filter}"${searchText ? ` and search "${searchText}"` : ""}.`
        : `No storage drives matching "${searchText}".`;

    return (
      <List.EmptyView
        icon={icon || Icon.MagnifyingGlass}
        title={title || "No Matching Drives"}
        description={
          description ||
          `${filterDesc} Try clearing the filter or adjusting your search query.`
        }
        actions={
          <ActionPanel>
            {onResetFilter && (
              <Action
                title="Clear Filters & Search"
                icon={Icon.XMarkCircle}
                onAction={onResetFilter}
                shortcut={{ modifiers: ["cmd"], key: "x" }}
              />
            )}
            <Action
              title="Refresh Storage List"
              icon={Icon.RotateClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Open Storage Settings"
              icon={Icon.Gear}
              onAction={openStorageSense}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.EmptyView
      icon={icon || Icon.HardDrive}
      title={
        title ||
        (isLoading
          ? "Scanning Storage Drives..."
          : "No Storage Drives Detected")
      }
      description={
        description ||
        (isLoading
          ? "Querying system CIM, WMI, and storage devices..."
          : "No connected storage devices, fixed drives, or network shares were found on this system.")
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh Storage List"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Launch Disk Cleanup"
            icon={Icon.Trash}
            onAction={() => launchDiskCleanup()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
          />
          <Action
            title="Open Storage Settings"
            icon={Icon.Gear}
            onAction={openStorageSense}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}
