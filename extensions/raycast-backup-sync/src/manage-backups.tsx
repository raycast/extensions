import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listDeviceBackups } from "./lib/listing";
import { deleteBackup } from "./lib/db";
import { formatBytes, formatTimestamp } from "./lib/format";
import { StoredBackup } from "./lib/types";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    listDeviceBackups,
    [],
    {
      keepPreviousData: true,
    },
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't load backups"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const backups = data ?? [];
  const totalBytes = backups.reduce((sum, b) => sum + b.zipBytes, 0);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search backups…"
    >
      <List.EmptyView
        icon={Icon.Cloud}
        title="No backups for this device yet"
        description="Run “Backup Raycast to Neon” to create one."
      />
      <List.Section
        title="Backups"
        subtitle={`${backups.length} · ${formatBytes(totalBytes)}`}
      >
        {backups.map((backup) => (
          <BackupRow key={backup.id} backup={backup} onChanged={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}

function BackupRow({
  backup,
  onChanged,
}: {
  backup: StoredBackup;
  onChanged: () => void;
}) {
  const m = backup.metadata;
  const markdown = [
    `# Backup · ${formatTimestamp(m.timestamp)}`,
    "",
    m.restoreNote ? `> ${m.restoreNote}` : "",
  ].join("\n");

  return (
    <List.Item
      icon={Icon.Document}
      title={formatTimestamp(m.timestamp)}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Device"
                text={m.deviceName}
              />
              <List.Item.Detail.Metadata.Label
                title="Archive Size"
                text={formatBytes(backup.zipBytes)}
              />
              <List.Item.Detail.Metadata.Label
                title="Uncompressed"
                text={m.totalBytes ? formatBytes(m.totalBytes) : "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Files"
                text={m.files.length ? String(m.files.length) : "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Raycast Version"
                text={m.raycastVersionAtBackup ?? "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="macOS"
                text={m.macosVersion ?? "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Clipboard History"
                text={m.includedActivities ? "Included" : "Excluded"}
              />
              <List.Item.Detail.Metadata.Label
                title="Raycast Was Running"
                text={
                  m.raycastWasRunning
                    ? "Yes (snapshot may be slightly stale)"
                    : "No"
                }
              />
              <List.Item.Detail.Metadata.Label
                title="Checksum"
                text={m.sha256 ? "SHA-256 recorded" : "—"}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Delete Backup"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => remove(backup, onChanged)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onChanged}
          />
        </ActionPanel>
      }
    />
  );
}

async function remove(backup: StoredBackup, onChanged: () => void) {
  const confirmed = await confirmAlert({
    title: "Delete this backup?",
    message: `Permanently delete the backup from ${formatTimestamp(backup.metadata.timestamp)}.`,
    icon: { source: Icon.Trash, tintColor: Color.Red },
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Deleting…",
  });
  try {
    await deleteBackup(backup.id);
    toast.style = Toast.Style.Success;
    toast.title = "Backup deleted";
    onChanged();
  } catch (error) {
    await showFailureToast(error, { title: "Delete failed" });
    toast.hide();
  }
}
