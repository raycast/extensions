import {
  Action,
  ActionPanel,
  List,
  confirmAlert,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { migrateLocalToICloudKeychain } from "../lib/storage";

type StorageBackendKind = "local" | "icloud-keychain";
type StoragePreferences = {
  storageBackend?: StorageBackendKind;
};

export default function MigrateCommand() {
  const [isWorking, setIsWorking] = useState(false);
  const prefs = getPreferenceValues<StoragePreferences>();
  const backend = prefs.storageBackend ?? "local";

  async function migrate(deleteLocalAfter: boolean) {
    setIsWorking(true);
    try {
      const result = await migrateLocalToICloudKeychain({ deleteLocalAfter });
      await showToast({
        style: Toast.Style.Success,
        title: "Migration complete",
        message: `Migrated ${result.migrated}, skipped ${result.skipped}`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Migration failed",
        message,
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function migrateAndDeleteLocal() {
    const ok = await confirmAlert({
      title: "Migrate to iCloud Keychain?",
      message:
        "This will copy your current local records into macOS Keychain (syncs via iCloud Keychain).\n\nAfter migration, local records on this Mac will be deleted.",
      primaryAction: { title: "Migrate & Delete Local" },
    });
    if (!ok) return;
    await migrate(true);
  }

  async function migrateKeepLocal() {
    const ok = await confirmAlert({
      title: "Migrate to iCloud Keychain?",
      message:
        "This will copy your current local records into macOS Keychain (syncs via iCloud Keychain).\n\nLocal records on this Mac will be kept.",
      primaryAction: { title: "Migrate (Keep Local)" },
    });
    if (!ok) return;
    await migrate(false);
  }

  return (
    <List isLoading={isWorking}>
      <List.Item
        title="Migrate Local → iCloud Keychain"
        subtitle={
          backend === "icloud-keychain"
            ? "Keychain backend is currently selected"
            : "Tip: Set Storage Backend preference to iCloud Keychain after migrating"
        }
        actions={
          <ActionPanel>
            <Action title="Migrate (Keep Local)" onAction={migrateKeepLocal} />
            <Action
              title="Migrate & Delete Local"
              style={Action.Style.Destructive}
              onAction={migrateAndDeleteLocal}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="How syncing works"
        subtitle="iCloud Keychain syncs through Apple, not Raycast Cloud Sync"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Note"
              content="This extension can use macOS Keychain (iCloud Keychain) so your vault syncs across Macs signed into the same Apple ID with iCloud Keychain enabled. Raycast Cloud Sync does not currently sync extension LocalStorage secrets across devices."
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
