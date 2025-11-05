// Common types shared across all platforms

export interface ProgramInfo {
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
   * Get list of open programs using native platform API
   * @param options Platform-specific options (e.g., showAllMonitors on Windows)
   */
  getProgramsNative(options?: Record<string, unknown>): Promise<ProgramInfo[]>;

  /**
   * Get list of open programs using Raycast WindowManagement API
   * Enhanced with native data if needed
   */
  getProgramsAPI(): Promise<ProgramInfo[]>;

  /**
   * Switch to a program by ID
   * @param programId Platform-specific program identifier
   * @param programTitle Display title for user feedback
   */
  switchToProgram(programId: string, programTitle: string): Promise<void>;

  /**
   * Close a program by ID
   * @param programId Platform-specific program identifier
   * @param programTitle Display title for user feedback
   */
  closeProgram(programId: string, programTitle: string): Promise<void>;

  /**
   * Get icon for a program
   * @param program Program info
   */
  getProgramIcon(program: ProgramInfo): { fileIcon: string } | string;

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
