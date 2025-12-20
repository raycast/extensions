import { useState } from "react";
import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchApps, resetApiClient } from "./api/appStoreConnect";
import { getStatusInfo, getPlatformIcon, getPlatformLabel } from "./utils/statusHelpers";
import { ProcessedApp, AppStoreState } from "./types";

type StatusFilter = "all" | AppStoreState;

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: Icon }[] = [
  { value: "all", label: "All Apps", icon: Icon.List },
  { value: "READY_FOR_SALE", label: "✅ Ready for Sale", icon: Icon.CheckCircle },
  { value: "IN_REVIEW", label: "👀 In Review", icon: Icon.Eye },
  { value: "WAITING_FOR_REVIEW", label: "⏳ Waiting for Review", icon: Icon.Clock },
  { value: "PENDING_DEVELOPER_RELEASE", label: "🚀 Pending Developer Release", icon: Icon.Clock },
  { value: "PREPARE_FOR_SUBMISSION", label: "✏️ Prepare for Submission", icon: Icon.Pencil },
  { value: "REJECTED", label: "❌ Rejected", icon: Icon.XMarkCircle },
];

export default function Command() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const {
    data: apps,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchApps, [], {
    keepPreviousData: true,
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load apps",
        message: getErrorMessage(err),
      });
    },
  });

  async function handleRefresh() {
    resetApiClient();
    await revalidate();
  }

  const filteredApps = apps?.filter((app) => {
    if (statusFilter === "all") return true;
    return app.latestVersion?.state === statusFilter;
  });

  const filterLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label || "All Apps";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        statusFilter === "all" ? "Search apps..." : `Search in ${filterLabel}...`
      }
    >
      {error && !apps ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Apps"
          description={getErrorMessage(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
              <Action.CopyToClipboard
                title="Copy Error"
                content={getRawError(error)}
                icon={Icon.Clipboard}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : filteredApps?.length === 0 ? (
        <List.EmptyView
          icon={Icon.AppWindow}
          title={statusFilter === "all" ? "No Apps Found" : "No Apps Match Filter"}
          description={
            statusFilter === "all"
              ? "No apps were found in your App Store Connect account."
              : `No apps with status "${filterLabel}". Try a different filter.`
          }
          actions={
            <ActionPanel>
              <Action
                title="Show All Apps"
                icon={Icon.List}
                onAction={() => setStatusFilter("all")}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredApps?.map((app) => (
          <AppListItem
            key={app.id}
            app={app}
            onRefresh={handleRefresh}
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />
        ))
      )}
    </List>
  );
}

interface AppListItemProps {
  app: ProcessedApp;
  onRefresh: () => void;
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

function AppListItem({ app, onRefresh, statusFilter, onFilterChange }: AppListItemProps) {
  const statusInfo = app.latestVersion ? getStatusInfo(app.latestVersion.state) : null;

  const accessories: List.Item.Accessory[] = [];

  if (app.latestVersion) {
    // Add version number
    accessories.push({
      text: `v${app.latestVersion.versionString}`,
      tooltip: `Version ${app.latestVersion.versionString}`,
    });

    // Add platform icon
    accessories.push({
      icon: getPlatformIcon(app.latestVersion.platform),
      tooltip: getPlatformLabel(app.latestVersion.platform),
    });

    // Add status tag with color
    accessories.push({
      tag: {
        value: statusInfo!.label,
        color: statusInfo!.color,
      },
      tooltip: `Status: ${statusInfo!.label}`,
    });
  } else {
    accessories.push({
      tag: {
        value: "No Version",
        color: Color.SecondaryText,
      },
    });
  }

  return (
    <List.Item
      icon={statusInfo?.icon || Icon.AppWindow}
      title={app.name}
      subtitle={app.bundleId}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<AppDetailView app={app} />}
            />
            <Action.OpenInBrowser
              title="Open in App Store Connect"
              url={app.appStoreConnectUrl}
              icon={Icon.Globe}
            />
            <Action.CopyToClipboard
              title="Copy Bundle ID"
              content={app.bundleId}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Filter by Status">
            {STATUS_FILTERS.map((filter) => (
              <Action
                key={filter.value}
                title={filter.label}
                icon={statusFilter === filter.value ? Icon.CheckCircle : filter.icon}
                onAction={() => onFilterChange(filter.value)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
            <Action.CopyToClipboard
              title="Copy App ID"
              content={app.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AppDetailView({ app }: { app: ProcessedApp }) {
  const statusInfo = app.latestVersion ? getStatusInfo(app.latestVersion.state) : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const markdown = `
# ${app.name}

**Bundle ID:** \`${app.bundleId}\`

---

## Latest Version

${
  app.latestVersion
    ? `
| Field | Value |
|-------|-------|
| **Version** | ${app.latestVersion.versionString} |
| **Status** | ${statusInfo?.label || app.latestVersion.state} |
| **Platform** | ${getPlatformLabel(app.latestVersion.platform)} |
| **Created** | ${formatDate(app.latestVersion.createdDate)} |
| **Release Type** | ${app.latestVersion.releaseType || "N/A"} |
`
    : "*No version available*"
}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="App ID" text={app.id} />
          <Detail.Metadata.Label title="Bundle ID" text={app.bundleId} />
          <Detail.Metadata.Separator />
          {app.latestVersion && (
            <>
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={statusInfo?.label || app.latestVersion.state}
                  color={statusInfo?.color || Color.SecondaryText}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Version" text={app.latestVersion.versionString} />
              <Detail.Metadata.Label
                title="Platform"
                text={getPlatformLabel(app.latestVersion.platform)}
                icon={getPlatformIcon(app.latestVersion.platform)}
              />
              <Detail.Metadata.Label
                title="Created"
                text={formatDate(app.latestVersion.createdDate)}
              />
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="App Store Connect"
            target={app.appStoreConnectUrl}
            text="Open in Browser"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in App Store Connect"
            url={app.appStoreConnectUrl}
            icon={Icon.Globe}
          />
          <Action.CopyToClipboard
            title="Copy Bundle ID"
            content={app.bundleId}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            title="Copy App ID"
            content={app.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("401") || message.includes("unauthorized")) {
      return "Authentication failed. Please check your API credentials in the extension preferences.";
    }
    if (message.includes("403") || message.includes("forbidden")) {
      return "Access denied. Your API key may not have the required permissions.";
    }
    if (message.includes("429") || message.includes("rate")) {
      return "Rate limit exceeded. Please wait a moment and try again.";
    }
    if (message.includes("network") || message.includes("fetch")) {
      return "Network error. Please check your internet connection.";
    }
    return error.message;
  }
  return "An unexpected error occurred";
}

function getRawError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n\nStack:\n${error.stack || "N/A"}`;
  }
  return String(error);
}
