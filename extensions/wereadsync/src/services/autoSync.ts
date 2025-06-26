import { getLocalStorageItem, setLocalStorageItem, showToast, Toast } from "@raycast/api";
import { SyncService } from "./syncService";

export class AutoSyncService {
  private static instance: AutoSyncService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  static getInstance(): AutoSyncService {
    if (!AutoSyncService.instance) {
      AutoSyncService.instance = new AutoSyncService();
    }
    return AutoSyncService.instance;
  }

  async startAutoSync(): Promise<void> {
    if (this.isRunning) {
      console.log("[AutoSync] Auto-sync is already running");
      return;
    }

    const settings = await this.getAutoSyncSettings();
    if (!settings.enabled) {
      console.log("[AutoSync] Auto-sync is disabled");
      return;
    }

    if (!settings.wereadCookie || !settings.readwiseToken) {
      console.log("[AutoSync] Missing credentials for auto-sync");
      return;
    }

    this.isRunning = true;
    const interval = this.getIntervalMs(settings.interval);

    console.log(`[AutoSync] Starting auto-sync with interval: ${settings.interval} (${interval}ms)`);

    // Run initial sync
    await this.performSync(settings.wereadCookie, settings.readwiseToken);

    // Schedule periodic syncs
    this.intervalId = setInterval(async () => {
      await this.performSync(settings.wereadCookie, settings.readwiseToken);
    }, interval);

    await showToast({
      style: Toast.Style.Success,
      title: "Auto-sync Started",
      message: `Checking for new highlights ${settings.interval}`,
    });
  }

  async stopAutoSync(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log("[AutoSync] Auto-sync stopped");

    await showToast({
      style: Toast.Style.Success,
      title: "Auto-sync Stopped",
      message: "Automatic sync has been disabled",
    });
  }

  private async getAutoSyncSettings() {
    try {
      const enabled = await getLocalStorageItem<string>("autoSyncEnabled");
      const interval = await getLocalStorageItem<string>("autoSyncInterval");
      const wereadCookie = await getLocalStorageItem<string>("wereadCookie");
      const readwiseToken = await getLocalStorageItem<string>("readwiseToken");

      return {
        enabled: enabled ? JSON.parse(enabled) : false,
        interval: interval || "daily",
        wereadCookie: wereadCookie || "",
        readwiseToken: readwiseToken || "",
      };
    } catch (error) {
      console.error("[AutoSync] Failed to load settings:", error);
      return {
        enabled: false,
        interval: "daily",
        wereadCookie: "",
        readwiseToken: "",
      };
    }
  }

  private getIntervalMs(interval: string): number {
    switch (interval) {
      case "hourly":
        return 60 * 60 * 1000; // 1 hour
      case "daily":
        return 24 * 60 * 60 * 1000; // 24 hours
      case "weekly":
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  private async performSync(wereadCookie: string, readwiseToken: string): Promise<void> {
    try {
      console.log("[AutoSync] Starting automatic incremental sync...");

      // Update last sync time
      await setLocalStorageItem("lastAutoSyncTime", String(Date.now()));

      // Use the SyncService for incremental sync
      const syncService = new SyncService(wereadCookie, readwiseToken);
      const result = await syncService.performIncrementalSync();

      console.log(`[AutoSync] Automatic sync completed. ${result.syncedCount} new highlights synced.`);
    } catch (error) {
      console.error("[AutoSync] Auto-sync failed:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Auto-sync Failed",
        message: "Failed to sync highlights automatically",
      });
    }
  }

  isAutoSyncRunning(): boolean {
    return this.isRunning;
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
}
