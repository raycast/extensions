import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  environment,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getAccessToken, isProUser, authorize } from "./utils/auth";
import { syncHighlights, backupHighlights, restoreHighlights } from "./utils/storage";

const LAST_BACKUP_KEY = "last_backup_time";
const LAST_SYNC_KEY = "last_sync_time";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      setIsSignedIn(!!token);

      if (token) {
        const pro = await isProUser();
        setIsPro(pro);

        const sync = await LocalStorage.getItem<boolean>("sync_enabled");
        setSyncEnabled(!!sync);

        const backupTime = await LocalStorage.getItem<number>(LAST_BACKUP_KEY);
        setLastBackupTime(backupTime ?? null);

        const syncTime = await LocalStorage.getItem<number>(LAST_SYNC_KEY);
        setLastSyncTime(syncTime ?? null);
      }
    } catch {
      // Status check failed
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignIn() {
    setIsLoading(true);
    try {
      await authorize();
      await showToast({ style: Toast.Style.Success, title: "Signed In" });
      await checkStatus();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Sign In Failed", message: String(error) });
      setIsLoading(false);
    }
  }

  async function handleBackup() {
    setIsLoading(true);
    try {
      await backupHighlights();
      const now = Date.now();
      await LocalStorage.setItem(LAST_BACKUP_KEY, now);
      setLastBackupTime(now);
      await showToast({ style: Toast.Style.Success, title: "Backup Complete" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Backup Failed", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    const confirmed = await confirmAlert({
      title: "Restore from Backup?",
      message: "This will merge the backup with your local highlights. Newer versions will overwrite older ones.",
      primaryAction: { title: "Restore", style: Alert.ActionStyle.Default },
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      await restoreHighlights();
      await showToast({ style: Toast.Style.Success, title: "Restore Complete" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Restore Failed", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleManualSync() {
    setIsLoading(true);
    try {
      await syncHighlights();
      const now = Date.now();
      await LocalStorage.setItem(LAST_SYNC_KEY, now);
      setLastSyncTime(now);
      await showToast({ style: Toast.Style.Success, title: "Sync Complete" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Sync Failed", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleSync() {
    const newValue = !syncEnabled;
    await LocalStorage.setItem("sync_enabled", newValue);
    setSyncEnabled(newValue);
    if (newValue) {
      await handleManualSync();
    } else {
      await showToast({ title: "Sync Disabled", style: Toast.Style.Success });
    }
  }

  if (isLoading) return <Detail isLoading={true} />;

  const iconPath = `${environment.assetsPath}/extension-icon.png`;

  if (!isSignedIn) {
    return (
      <Detail
        markdown={`
  <img src="${iconPath}" width="64" height="64" alt="YouTube Highlights Logo" />

  # Sign-in required

  You need to be signed in to back up your highlights.
  `}
        actions={
          <ActionPanel>
            <Action title="Sign in to Backup" icon={Icon.Person} onAction={handleSignIn} />
          </ActionPanel>
        }
      />
    );
  }

  function formatRelativeTime(timestamp: number | null): string {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString();
  }

  if (!isPro) {
    const freeMarkdown = `
<img src="${iconPath}" width="64" height="64" alt="YouTube Highlights Logo" />

# Backup & Restore

**Free Plan**: You can backup and restore highlights on this device.

Cross-device sync is a **Pro** feature. Upgrade to sync your highlights automatically across all your devices.

---

**Last backup**: ${formatRelativeTime(lastBackupTime)}
`;

    return (
      <Detail
        markdown={freeMarkdown}
        actions={
          <ActionPanel>
            <Action title="Backup Now" icon={Icon.Upload} onAction={handleBackup} />
            <Action title="Restore from Backup" icon={Icon.Download} onAction={handleRestore} />
            <Action.OpenInBrowser url="https://youtubehighlightsapp.com/pricing" title="Upgrade to Pro" />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `
<img src="${iconPath}" width="64" height="64" alt="YouTube Highlights Logo" />

# Synchronization

**Status**: ${syncEnabled ? "✅ Enabled" : "❌ Disabled"}

${syncEnabled ? "Your highlights are automatically synced across all your devices." : "Your highlights are stored locally only. Enable sync to keep them in sync across devices."}

---

**Last sync**: ${formatRelativeTime(lastSyncTime)}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Sync Now" icon={Icon.ArrowClockwise} onAction={handleManualSync} />
          <Action
            title={syncEnabled ? "Disable Sync" : "Enable Sync"}
            icon={syncEnabled ? Icon.XMarkCircle : Icon.CheckCircle}
            onAction={toggleSync}
          />
        </ActionPanel>
      }
    />
  );
}
