import { Action, ActionPanel, Color, confirmAlert, Icon, List, open, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchCreateBackup, fetchDeleteBackup, fetchGetAllBackups, fetchGetBackupDownloadUrl } from "./apis";
import { useTranslation } from "./hooks/useTranslation";
import { connectionGuard } from "./components/ConnectionErrorView";
import { handleFetchError } from "./utils/fetchError";
import { isAuthError } from "./utils/apiError";
import { useLiveData } from "./hooks/useLiveData";
import { formatBytes } from "./utils/formatting";
import { attachCopyDetail, runWithToast } from "./utils/toast";

const log = logger.child("[Backups]");

const POLL_INTERVAL_MS = 5000;

export default function Backups() {
  const { t } = useTranslation();
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async () => {
      log.log("Fetching backups");
      const result = await fetchGetAllBackups();
      log.info("Backups fetched", { count: result.backups?.length ?? 0 });
      return result.backups || [];
    },
    [],
    // Suppresses Raycast's built-in "Failed to fetch latest data" toast.
    { onError: handleFetchError("backups") },
  );

  const hasLiveData = useLiveData(isLoading, error);
  const backups = data || [];
  const hasPending = backups.some((b) => b.status === "pending");

  // Poll while any backup is pending
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    // `!isAuthError(error)`: a 401 never resolves itself, so a pending backup
    // would otherwise poll every few seconds forever behind the auth screen,
    // firing a failure toast on each tick. A connection error is NOT excluded —
    // polling is exactly how that one recovers.
    if (hasPending && !isAuthError(error)) {
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
  }, [hasPending, error, revalidate]);

  // Show a toast when a backup transitions to failure
  const prevBackupsRef = useRef<typeof backups>([]);
  useEffect(() => {
    const prev = prevBackupsRef.current;
    const newlyFailed = backups.filter(
      (backup) => prev.find((b) => b.id === backup.id)?.status === "pending" && backup.status === "failure",
    );
    // Advance the baseline before any early return, or a poll that shows no
    // toast would leave the previous snapshot in place and re-report next time.
    prevBackupsRef.current = backups;
    if (newlyFailed.length === 0) return;

    log.error("Backup failed", { backupIds: newlyFailed.map((backup) => backup.id) });

    // ONE toast for the whole batch. showToast REPLACES whatever is on screen, so
    // a toast per backup leaves only the last one visible — and awaiting it here
    // rather than chaining .then() means the Copy Error action lands on the toast
    // we actually showed, and a rejection can't escape as an unhandled promise.
    // The failure arrives as a status field, not an exception, so there is nothing
    // to unwrap — the backup ids are what make this reportable.
    async function notifyFailed() {
      try {
        const toast = await showToast({ style: Toast.Style.Failure, title: t("backups.toast.failure") });
        attachCopyDetail(
          toast,
          newlyFailed.map((backup) => `Backup ${backup.id} moved from pending to failure.`).join("\n"),
        );
      } catch (error) {
        log.error("Could not show the backup failure toast", { error });
      }
    }

    notifyFailed();
  }, [backups, t]);

  async function handleCreate() {
    // The sentinel exists so the caller can tell success from failure at all:
    // runWithToast swallows a failure into `undefined`, and an action returning
    // void resolves to `undefined` on BOTH paths.
    const created = await runWithToast({
      loading: { title: t("backups.toast.create.loading") },
      success: { title: t("backups.toast.create.success") },
      failure: { title: t("backups.toast.create.error") },
      action: async () => {
        await fetchCreateBackup();
        log.info("Backup created");
        return true;
      },
    });
    // Refreshing after a REJECTED mutation fires a second auth toast over the
    // one runWithToast just showed, and swaps the view for the auth screen.
    if (created) await revalidate();
  }

  async function handleDelete(id: string) {
    if (
      await confirmAlert({
        title: t("backups.deleteBackup"),
        message: t("backups.deleteConfirm"),
      })
    ) {
      const deleted = await runWithToast({
        loading: { title: t("backups.toast.delete.loading") },
        success: { title: t("backups.toast.delete.success") },
        failure: { title: t("backups.toast.delete.error") },
        action: async () => {
          await fetchDeleteBackup(id);
          log.info("Backup deleted", { backupId: id });
          return true;
        },
      });
      if (deleted) await revalidate();
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
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );

  const guard = connectionGuard(error, hasLiveData, revalidate);
  if (guard) return guard;

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
                    shortcut={Keyboard.Shortcut.Common.Remove}
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
