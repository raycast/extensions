import { showToast, Toast, environment, LocalStorage } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./preferences";
import { promises as fs } from "fs";
import { fetchEnvelopesFromCLI } from "./control";

export default async function Command() {
  const isRunningInBackground = environment.launchType === "background";
  const preferences = getPreferenceValues<Preferences>();

  try {
    await fs.access(preferences.binaryPath);
  } catch {
    if (!isRunningInBackground) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Binary not found",
      });
    }
    return;
  }

  try {
    // Show toast that sync is starting (only if not in background)
    if (!isRunningInBackground) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Syncing envelopes",
      });
    }

    const envelopes = await fetchEnvelopesFromCLI(preferences);

    await LocalStorage.setItem("envelopes", JSON.stringify(envelopes));
    await LocalStorage.setItem("lastSync", new Date().toISOString());

    // Show success toast (only if not in background)
    if (!isRunningInBackground) {
      await showToast({
        style: Toast.Style.Success,
        title: "Sync completed",
        message: `${envelopes.length} envelopes synced`,
      });
    }
  } catch (syncError) {
    console.error("Sync error:", syncError);
    if (!isRunningInBackground) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sync failed",
        message: syncError instanceof Error ? syncError.message : String(syncError),
      });
    }
  }
}
