export interface App {
  name: string;
  windowTitle: string;
  isRunning: boolean;
  bundlePath?: string;
}

// Cache configuration
export const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

// Storage keys
export const HOTKEY_STORAGE_KEY = "instant-application-switcher-hotkeys";
export const RECENT_APPS_STORAGE_KEY = "instant-application-switcher-recent-applications";
export const MAX_RECENT_APPS = 25;
