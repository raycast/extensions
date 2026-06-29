import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  open,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listDeviceBackups } from "./lib/listing";
import { runRestore, DeviceMismatchError } from "./lib/restore";
import { isRaycastRunning, quitRaycast } from "./lib/system";
import { formatBytes, formatTimestamp } from "./lib/format";
import { DriveBackup } from "./lib/types";

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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search backups by date or version…"
    >
      <List.EmptyView
        icon={Icon.Cloud}
        title="No backups for this device yet"
        description="Run “Backup Raycast to Google Drive” first."
      />
      {(data ?? []).map((backup) => (
        <BackupItem
          key={backup.zipFileId}
          backup={backup}
          onChanged={revalidate}
        />
      ))}
    </List>
  );
}

function BackupItem({
  backup,
  onChanged,
}: {
  backup: DriveBackup;
  onChanged: () => void;
}) {
  const { metadata } = backup;
  const accessories: List.Item.Accessory[] = [
    { text: formatBytes(backup.zipBytes) },
  ];
  if (metadata.includedActivities) {
    accessories.unshift({
      icon: Icon.Clipboard,
      tooltip: "Includes clipboard history",
    });
  }

  return (
    <List.Item
      icon={Icon.Clock}
      title={formatTimestamp(metadata.timestamp)}
      subtitle={
        metadata.raycastVersionAtBackup
          ? `Raycast ${metadata.raycastVersionAtBackup}`
          : undefined
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Restore This Backup"
            icon={Icon.Download}
            onAction={() => restore(backup, onChanged)}
          />
          <Action.OpenInBrowser
            title="Open Drive Folder"
            url="https://drive.google.com/drive/search?q=Raycast-Backups"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}

async function restore(backup: DriveBackup, onChanged: () => void) {
  const confirmed = await confirmAlert({
    title: "Restore this backup?",
    message:
      `This overwrites Raycast's current data on this Mac with the backup from ` +
      `${formatTimestamp(backup.metadata.timestamp)}. Your current data is copied aside first. ` +
      `Raycast must be quit during the restore.`,
    icon: Icon.Download,
    primaryAction: {
      title: "Quit Raycast & Restore",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Restoring…",
  });

  try {
    if (await isRaycastRunning()) {
      toast.title = "Quitting Raycast…";
      const quit = await quitRaycast();
      if (quit && (await isRaycastRunning())) {
        throw new Error(
          "Raycast is still running. Quit it manually and try again.",
        );
      }
    }

    const result = await runRestore(backup, {}, (message) => {
      toast.title = message;
    });

    toast.style = Toast.Style.Success;
    toast.title = "Restore complete";
    toast.message = `${result.restoredFiles.length} files restored. Reopen Raycast to load them.`;
    toast.primaryAction = {
      title: "Reopen Raycast",
      onAction: () => open("raycast://"),
    };
    onChanged();
  } catch (error) {
    if (error instanceof DeviceMismatchError) {
      await handleDeviceMismatch(backup, toast, onChanged);
      return;
    }
    await showFailureToast(error, { title: "Restore failed" });
    toast.hide();
  }
}

async function handleDeviceMismatch(
  backup: DriveBackup,
  toast: Toast,
  onChanged: () => void,
) {
  toast.hide();
  const proceed = await confirmAlert({
    title: "Backup is from a different device",
    message:
      "Raycast's databases are encrypted with a key stored in this Mac's Keychain. A backup made " +
      "on another machine may fail to open after restore. Restore anyway?",
    icon: { source: Icon.Warning, tintColor: Color.Orange },
    primaryAction: {
      title: "Restore Anyway",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!proceed) return;

  const retryToast = await showToast({
    style: Toast.Style.Animated,
    title: "Restoring…",
  });
  try {
    if (await isRaycastRunning()) await quitRaycast();
    const result = await runRestore(
      backup,
      { allowDeviceMismatch: true },
      (m) => {
        retryToast.title = m;
      },
    );
    retryToast.style = Toast.Style.Success;
    retryToast.title = "Restore complete";
    retryToast.message = `${result.restoredFiles.length} files restored. Reopen Raycast to load them.`;
    onChanged();
  } catch (error) {
    await showFailureToast(error, { title: "Restore failed" });
    retryToast.hide();
  }
}
