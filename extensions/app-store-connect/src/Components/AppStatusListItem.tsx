import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { getCompactStatusLabel, getPlatformIcon, getPlatformLabel, getStatusInfo } from "../Utils/statusHelpers";
import { PendingRelease, ProcessedApp, ProcessedAppVersion, STATUS_FILTERS, StatusFilter } from "../appStatus";
import AppStatusDetail from "./AppStatusDetail";

interface AppStatusListItemProps {
  app: ProcessedApp;
  version: ProcessedAppVersion | undefined;
  pendingReleaseApps: PendingRelease[];
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

export default function AppStatusListItem({
  app,
  version,
  pendingReleaseApps,
  statusFilter,
  onFilterChange,
}: AppStatusListItemProps) {
  const statusInfo = version ? getStatusInfo(version.state) : null;
  const shortBundleId = compactTextMiddle(app.bundleId, 24, 8);
  const compactStatus = version ? getCompactStatusLabel(version.state) : "No Version";

  const accessories: List.Item.Accessory[] = [];
  if (version) {
    accessories.push({
      tag: {
        value: compactStatus,
        color: statusInfo?.color ?? Color.SecondaryText,
      },
      tooltip: `Status: ${statusInfo?.label ?? version.state}`,
    });
    accessories.push({
      icon: getPlatformIcon(version.platform),
      tooltip: getPlatformLabel(version.platform),
    });
  } else {
    accessories.push({
      tag: { value: compactStatus, color: Color.SecondaryText },
    });
  }

  return (
    <List.Item
      icon={statusInfo?.icon ?? Icon.AppWindow}
      title={app.name}
      subtitle={shortBundleId}
      keywords={[app.bundleId, app.id, app.name]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<AppStatusDetail app={app} version={version} />}
            />
            <ReleaseAppAction app={app} version={version} />
            <ReleaseAllAppsAction pending={pendingReleaseApps} />
            <Action.OpenInBrowser title="Open in App Store Connect" url={app.appStoreConnectUrl} icon={Icon.Globe} />
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
        </ActionPanel>
      }
    />
  );
}

export function ReleaseAppAction({
  app,
  version,
  onSuccess,
}: {
  app: ProcessedApp;
  version: ProcessedAppVersion | undefined;
  onSuccess?: () => void;
}) {
  if (!version || version.state !== "PENDING_DEVELOPER_RELEASE") {
    return null;
  }

  return (
    <Action
      title="Release App Now"
      icon={Icon.Upload}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: `Release ${app.name}?`,
          message: `Version ${version.versionString} will be released on the App Store immediately.`,
          primaryAction: { title: "Release Now", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Releasing app…",
          message: `${app.name} ${version.versionString}`,
        });

        try {
          await releaseAppVersion(version.id);
          toast.style = Toast.Style.Success;
          toast.title = "App released";
          toast.message = `${app.name} ${version.versionString}`;
          onSuccess?.();
        } catch (error) {
          toast.hide();
          presentError(error);
        }
      }}
    />
  );
}

function ReleaseAllAppsAction({ pending }: { pending: PendingRelease[] }) {
  if (pending.length === 0) return null;

  return (
    <Action
      title={`Release All Pending Apps (${pending.length})`}
      icon={Icon.Rocket}
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      onAction={async () => {
        const preview = pending
          .slice(0, 3)
          .map(({ app }) => app.name)
          .join(", ");
        const remaining = pending.length - Math.min(pending.length, 3);
        const summary = remaining > 0 ? `${preview} and ${remaining} more` : preview;

        const confirmed = await confirmAlert({
          title: `Release ${pending.length} apps?`,
          message: `This will immediately release all versions pending developer release: ${summary}.`,
          primaryAction: { title: "Release All", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Releasing apps…",
          message: `0/${pending.length}`,
        });

        const failures: string[] = [];
        for (const [index, entry] of pending.entries()) {
          toast.message = `${index + 1}/${pending.length} · ${entry.app.name}`;
          try {
            await releaseAppVersion(entry.version.id);
          } catch (error) {
            failures.push(`${entry.app.name}: ${errorMessage(error)}`);
          }
        }

        const releasedCount = pending.length - failures.length;
        if (failures.length === 0) {
          toast.style = Toast.Style.Success;
          toast.title = "Apps released";
          toast.message = `${releasedCount} apps released successfully`;
          return;
        }

        toast.style = Toast.Style.Failure;
        toast.title = "Bulk release finished with errors";
        toast.message =
          failures.length === pending.length
            ? "No apps were released"
            : `${releasedCount} released, ${failures.length} failed`;
      }}
    />
  );
}

async function releaseAppVersion(appStoreVersionId: string) {
  const response = await fetchAppStoreConnect("/appStoreVersionReleaseRequests", "POST", {
    data: {
      type: "appStoreVersionReleaseRequests",
      relationships: {
        appStoreVersion: {
          data: { type: "appStoreVersions", id: appStoreVersionId },
        },
      },
    },
  });
  if (!response) {
    throw new Error("Missing credentials – could not release app version");
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function compactTextMiddle(value: string, head: number, tail: number): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
