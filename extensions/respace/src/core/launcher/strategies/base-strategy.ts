import type { TrackedWindow, WorkspaceItem } from "../../../types/workspace";

/**
 * State captured before launching an item (for window tracking)
 */
export interface BeforeLaunchState {
  item: WorkspaceItem;
  wasRunning: boolean;
  windowIdsBefore: number[];
  appName: string;
}

export interface ItemLaunchStrategy {
  /**
   * Launches an item and returns tracked windows that were opened
   */
  launch(item: WorkspaceItem): Promise<TrackedWindow[]>;

  /**
   * Captures state before launching (for coordinated parallel launches)
   * Optional - only AppLauncher implements this
   */
  captureBeforeState?(item: WorkspaceItem): Promise<BeforeLaunchState>;

  /**
   * Launches an item without capturing before state (assumes captureBeforeState was called)
   * Optional - only AppLauncher implements this
   */
  launchOnly?(item: WorkspaceItem): Promise<void>;

  /**
   * Captures state after launching and returns tracked windows
   * Optional - only AppLauncher implements this
   */
  captureAfterState?(beforeState: BeforeLaunchState): Promise<TrackedWindow[]>;

  /**
   * Closes specific tracked windows
   */
  close(windows: TrackedWindow[]): Promise<void>;

  /**
   * Verifies which tracked windows still exist
   */
  verifyWindows(windows: TrackedWindow[]): Promise<TrackedWindow[]>;
}
