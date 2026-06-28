import { getLocalStorageItem, setLocalStorageItem, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { SyncService } from "./syncService";

export class AutoSyncService {
  private static instance: AutoSyncService;
  private isEnabled: boolean = false;

  static getInstance(): AutoSyncService {
    if (!AutoSyncService.instance) {
      AutoSyncService.instance = new AutoSyncService();
    }
    return AutoSyncService.instance;
  }

  async startAutoSync(): Promise<void> {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.autoSyncEnabled) {
      console.log("[AutoSync] Auto-sync is disabled");
      return;
    }

    if (!preferences.wereadCookie || !preferences.readwiseToken) {
      console.log("[AutoSync] Missing credentials for auto-sync");
      return;
    }

    this.isEnabled = true;

    console.log(`[AutoSync] Auto-sync enabled with ${preferences.autoSyncInterval} preference`);

    // Following Raycast guidelines: no background periodic sync
    // Instead, we perform sync when extension is actively used
    await this.performSyncIfNeeded(preferences.wereadCookie, preferences.readwiseToken, preferences.autoSyncInterval);

    await showToast({
      style: Toast.Style.Success,
      title: "Auto-sync Enabled",
      message: `Will sync when extension is used (${preferences.autoSyncInterval} preference)`,
    });
  }

  async stopAutoSync(): Promise<void> {
    this.isEnabled = false;
    console.log("[AutoSync] Auto-sync disabled");

    await showToast({
      style: Toast.Style.Success,
      title: "Auto-sync Disabled",
      message: "Automatic sync has been turned off",
    });
  }

  private getAutoSyncSettings(): Preferences {
    try {
      return getPreferenceValues<Preferences>();
    } catch (error) {
      console.error("[AutoSync] Failed to load preferences:", error);
      return {
        autoSyncEnabled: false,
        autoSyncInterval: "daily",
        wereadCookie: "",
        readwiseToken: "",
      };
    }
  }

  private getIntervalHours(interval: string): number {
    // Return hours for comparison with last sync time
    switch (interval) {
      case "hourly":
        return 1;
      case "daily":
        return 24;
      case "weekly":
        return 168; // 7 * 24
      default:
        return 24; // Default to daily
    }
  }

  private async performSyncIfNeeded(wereadCookie: string, readwiseToken: string, interval: string): Promise<void> {
    try {
      const now = Date.now();
      const intervalHours = this.getIntervalHours(interval);
      const intervalMs = intervalHours * 60 * 60 * 1000;
      const lastSyncTimeMs = await getLocalStorageItem<string>("lastAutoSyncTime");

      // Only sync if enough time has passed since last sync
      if (!lastSyncTimeMs || now - parseInt(lastSyncTimeMs || "0") > intervalMs) {
        console.log("[AutoSync] Performing incremental sync (interval reached)");

        // Use the SyncService for incremental sync
        const syncService = new SyncService(wereadCookie, readwiseToken);
        const result = await syncService.performIncrementalSync();

        // Update last sync time only after successful sync
        await setLocalStorageItem("lastAutoSyncTime", String(now));

        console.log(`[AutoSync] Sync completed. ${result.syncedCount} new highlights synced.`);
      } else {
        console.log("[AutoSync] Sync skipped (interval not reached)");
      }
    } catch (error) {
      console.error("[AutoSync] Auto-sync failed:", error);
      await showFailureToast(error, { title: "Auto-sync Failed" });
    }
  }

  isAutoSyncRunning(): boolean {
    return this.isEnabled;
  }

  async getLastSyncTime(): Promise<string> {
    try {
      const lastSync = await getLocalStorageItem<string>("lastAutoSyncTime");
      if (lastSync) {
        const date = new Date(parseInt(lastSync));
        return date.toLocaleString();
      }
      return "Never";
    } catch {
      return "Never";
    }
  }

  // Method to trigger sync when extension is actively used
  async checkAndSyncIfNeeded(): Promise<void> {
    const settings = this.getAutoSyncSettings();
    if (settings.autoSyncEnabled && settings.wereadCookie && settings.readwiseToken) {
      await this.performSyncIfNeeded(settings.wereadCookie, settings.readwiseToken, settings.autoSyncInterval);
    }
  }
}
