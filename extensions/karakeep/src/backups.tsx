import { Action, ActionPanel, Color, confirmAlert, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchCreateBackup, fetchDeleteBackup, fetchGetAllBackups, fetchGetBackupDownloadUrl } from "./apis";
import { useTranslation } from "./hooks/useTranslation";
import { formatBytes } from "./utils/formatting";
import { runWithToast } from "./utils/toast";

const log = logger.child("[Backups]");

const POLL_INTERVAL_MS = 5000;

export default function Backups() {
  const { t } = useTranslation();
  const { isLoading, data, revalidate } = useCachedPromise(async () => {
    log.log("Fetching backups");
    const result = await fetchGetAllBackups();
    log.info("Backups fetched", { count: result.backups?.length ?? 0 });
    return result.backups || [];
  });

  const backups = data || [];
  const hasPending = backups.some((b) => b.status === "pending");

  // Poll while any backup is pending
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (hasPending) {
      log.log("Starting backup status polling", { intervalMs: POLL_INTERVAL_MS });
      intervalRef.current = setInterval(() => {
        log.log("Polling for backup status update");
        revalidate();
      }, POLL_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        log.log("Stopping backup status polling — no pending backups");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasPending, revalidate]);

  // Show a toast when a backup transitions to failure
  const prevBackupsRef = useRef<typeof backups>([]);
  useEffect(() => {
    const prev = prevBackupsRef.current;
    for (const backup of backups) {
      const prevBackup = prev.find((b) => b.id === backup.id);
      if (prevBackup?.status === "pending" && backup.status === "failure") {
        log.error("Backup failed", { backupId: backup.id });
        showToast({ style: Toast.Style.Failure, title: t("backups.toast.failure") });
      }
    }
    prevBackupsRef.current = backups;
  }, [backups, t]);

  async function handleCreate() {
    await runWithToast({
      loading: { title: t("backups.toast.create.loading") },
      success: { title: t("backups.toast.create.success") },
      failure: { title: t("backups.toast.create.error") },
      action: async () => {
        await fetchCreateBackup();
        log.info("Backup created");
      },
    });
    await revalidate();
  }

  async function handleDelete(id: string) {
    if (
      await confirmAlert({
        title: t("backups.deleteBackup"),
        message: t("backups.deleteConfirm"),
      })
    ) {
      await runWithToast({
        loading: { title: t("backups.toast.delete.loading") },
        success: { title: t("backups.toast.delete.success") },
        failure: { title: t("backups.toast.delete.error") },
        action: async () => {
          await fetchDeleteBackup(id);
          log.info("Backup deleted", { backupId: id });
        },
      });
      await revalidate();
    }
  }

  async function handleDownload(id: string) {
    log.log("Downloading backup", { backupId: id });
    const url = await fetchGetBackupDownloadUrl(id);
    log.info("Opening backup download URL", { backupId: id });
    await open(url);
  }

  const createAction = (
    <Action
      title={t("backups.createBackup")}
      icon={Icon.Plus}
      onAction={handleCreate}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t("backups.searchPlaceholder")}
      actions={<ActionPanel>{createAction}</ActionPanel>}
    >
      {!isLoading && backups.length === 0 && (
        <List.EmptyView
          title={t("backups.empty.title")}
          description={t("backups.empty.description")}
          icon={Icon.HardDrive}
          actions={<ActionPanel>{createAction}</ActionPanel>}
        />
      )}
      {backups.map((backup) => {
        const date = new Date(backup.createdAt).toLocaleString();
        const isPending = backup.status === "pending";
        const isSuccess = backup.status === "success";
        const isFailure = backup.status === "failure";

        const tagColor = isFailure ? Color.Red : isPending ? Color.SecondaryText : Color.Green;
        const tagText = isFailure
          ? t("backups.statusFailure")
          : isPending
            ? t("backups.statusPending")
            : t("backups.statusSuccess");

        const accessories: List.Item.Accessory[] = [{ tag: { value: tagText, color: tagColor } }];

        return (
          <List.Item
            key={backup.id}
            icon={Icon.HardDrive}
            title={date}
            subtitle={backup.size ? formatBytes(backup.size) : undefined}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {isSuccess && (
                    <Action
                      title={t("backups.downloadBackup")}
                      icon={Icon.Download}
                      onAction={() => handleDownload(backup.id)}
                    />
                  )}
                  {createAction}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title={t("backups.deleteBackup")}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(backup.id)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
