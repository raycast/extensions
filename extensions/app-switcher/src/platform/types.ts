// Common types shared across all platforms

export interface AppInfo {
  id: string;
  title: string;
  appName: string;
  bundleId?: string;
  executablePath?: string;
  isActive: boolean;
  positionable: boolean;
  resizable: boolean;
}

export enum PlatformMode {
  API = "api", // Using Raycast WindowManagement API
  NATIVE = "native", // Using platform-specific native API (PowerShell on Windows, AppleScript on macOS)
}

export interface PlatformAdapter {
  /**
   * Check if the platform's native API is available and working
   */
  checkNativeApiAccess(): Promise<boolean>;

  /**
   * Get list of open apps using native platform API
   * @param options Platform-specific options (e.g., showAllMonitors on Windows)
   */
  getAppsNative(options?: Record<string, unknown>): Promise<AppInfo[]>;

  /**
   * Get list of open apps using Raycast WindowManagement API
   * Enhanced with native data if needed
   */
  getAppsAPI(): Promise<AppInfo[]>;

  /**
   * Switch to an application by ID
   * @param appId Platform-specific application identifier
   * @param appTitle Display title for user feedback
   */
  switchToApp(appId: string, appTitle: string): Promise<void>;

  /**
   * Close an application by ID
   * @param appId Platform-specific application identifier
   * @param appTitle Display title for user feedback
   */
  closeApp(appId: string, appTitle: string): Promise<void>;
  /**
   * Get icon for an application
   * @param app Application info
   */
  getAppIcon(app: AppInfo): { fileIcon: string } | string;

  /**
   * Get platform-specific filter options for the UI
   * Returns null if no filtering is needed
   */
  getFilterOptions(preferredFirst?: string): FilterOption[] | null;
}

export interface FilterOption {
  label: string;
  value: string;
  tooltip?: string;
}
