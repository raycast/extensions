/**
 * AsyncProgress utility for tracking parallel operations
 * Provides a counter that updates Raycast toasts as promises settle
 */

import { showToast, Toast } from "@raycast/api";
import { logger } from "./logger";

export interface ProgressOptions {
  title: string;
  totalItems: number;
  showItemNames?: boolean;
  platformTracking?: boolean;
}

export interface PlatformProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
}

export interface ProgressResult<T> {
  successful: T[];
  failed: Array<{ item: unknown; error: Error }>;
  platformResults?: Record<string, PlatformProgress>;
}

/**
 * AsyncProgress class for tracking parallel operations with toast updates
 */
export class AsyncProgress {
  private toast!: Toast;
  private completed = 0;
  private successful = 0;
  private failed = 0;
  private platformProgress: Record<string, PlatformProgress> = {};
  private lastUpdate = 0;
  private updateThrottle = 100; // Update toast every 100ms max

  constructor(private options: ProgressOptions) {}

  /**
   * Initialize the progress tracker
   */
  async initialize(): Promise<void> {
    this.toast = await showToast({
      style: Toast.Style.Animated,
      title: this.options.title,
      message: `Starting ${this.options.totalItems} operations...`,
    });
    logger.log(`[AsyncProgress] Initialized for ${this.options.totalItems} items`);
  }

  /**
   * Initialize platform tracking if enabled
   */
  initializePlatformTracking(items: Array<{ platform?: string }>): void {
    if (!this.options.platformTracking) return;

    this.platformProgress = {};
    items.forEach((item) => {
      if (item.platform) {
        if (!this.platformProgress[item.platform]) {
          this.platformProgress[item.platform] = {
            total: 0,
            completed: 0,
            successful: 0,
            failed: 0,
          };
        }
        this.platformProgress[item.platform].total++;
      }
    });

    logger.log(
      `[AsyncProgress] Platform tracking initialized:`,
      Object.entries(this.platformProgress)
        .map(([platform, progress]) => `${platform}: ${progress.total}`)
        .join(", "),
    );
  }

  /**
   * Report progress for a successful operation
   */
  reportSuccess(itemName?: string, platform?: string): void {
    this.completed++;
    this.successful++;

    if (platform && this.platformProgress[platform]) {
      this.platformProgress[platform].completed++;
      this.platformProgress[platform].successful++;
    }

    this.updateToast(itemName);
  }

  /**
   * Report progress for a failed operation
   */
  reportFailure(itemName?: string, platform?: string, error?: Error): void {
    this.completed++;
    this.failed++;

    if (platform && this.platformProgress[platform]) {
      this.platformProgress[platform].completed++;
      this.platformProgress[platform].failed++;
    }

    if (error) {
      logger.error(`[AsyncProgress] Operation failed for ${itemName || "item"}:`, error);
    }

    this.updateToast(itemName);
  }

  /**
   * Update the toast message with current progress
   */
  private updateToast(itemName?: string, force = false): void {
    const now = Date.now();
    if (!force && now - this.lastUpdate < this.updateThrottle) {
      return; // Throttle updates
    }
    this.lastUpdate = now;

    const progressPercent = Math.round((this.completed / this.options.totalItems) * 100);
    let message = `${this.completed}/${this.options.totalItems} (${progressPercent}%)`;

    if (this.options.platformTracking && Object.keys(this.platformProgress).length > 0) {
      const platformSummary = Object.entries(this.platformProgress)
        .filter(([, progress]) => progress.total > 0)
        .map(([platformName, progress]) => `${platformName}: ${progress.successful}/${progress.total}`)
        .join(", ");

      if (platformSummary) {
        message += ` | ${platformSummary}`;
      }
    }

    if (this.options.showItemNames && itemName) {
      message += ` - Latest: ${itemName}`;
    }

    if (this.failed > 0) {
      message += ` (${this.failed} failed)`;
    }

    if (this.toast) {
      this.toast.message = message;
    }
  }

  /**
   * Complete the progress tracking with final status
   */
  async complete(): Promise<void> {
    if (!this.toast) return;

    // Force a final update to ensure latest counts are reflected
    this.updateToast(undefined, true);

    const hasFailures = this.failed > 0;
    const allFailed = this.successful === 0;

    if (allFailed) {
      this.toast.style = Toast.Style.Failure;
      this.toast.title = "All operations failed";
      this.toast.message = `${this.failed} of ${this.options.totalItems} operations failed`;
    } else if (hasFailures) {
      this.toast.style = Toast.Style.Failure;
      this.toast.title = "Operations partially completed";

      if (this.options.platformTracking && Object.keys(this.platformProgress).length > 0) {
        const platformSummary = Object.entries(this.platformProgress)
          .filter(([, progress]) => progress.total > 0)
          .map(([platform, progress]) => `${platform}: ${progress.successful}/${progress.total}`)
          .join(", ");
        this.toast.message = `${this.successful}/${this.options.totalItems} successful | ${platformSummary}`;
      } else {
        this.toast.message = `${this.successful}/${this.options.totalItems} successful, ${this.failed} failed`;
      }
    } else {
      this.toast.style = Toast.Style.Success;
      this.toast.title = "All operations completed";

      if (this.options.platformTracking && Object.keys(this.platformProgress).length > 0) {
        const platformCount = Object.keys(this.platformProgress).filter(
          (p) => this.platformProgress[p].total > 0,
        ).length;
        this.toast.message = `Successfully completed all ${this.successful} operations across ${platformCount} platforms`;
      } else {
        this.toast.message = `Successfully completed all ${this.successful} operations`;
      }
    }

    logger.log(
      `[AsyncProgress] Completed: ${this.successful} successful, ${this.failed} failed out of ${this.options.totalItems} total`,
    );
  }

  /**
   * Get the current platform results
   */
  getPlatformResults(): Record<string, PlatformProgress> {
    return { ...this.platformProgress };
  }

  /**
   * Get current progress statistics
   */
  getStats() {
    return {
      total: this.options.totalItems,
      completed: this.completed,
      successful: this.successful,
      failed: this.failed,
      progressPercent: Math.round((this.completed / this.options.totalItems) * 100),
    };
  }
}

/**
 * Helper function to process promises with progress tracking
 */
export async function processWithProgress<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: ProgressOptions,
  getItemName?: (item: T) => string,
  getPlatform?: (item: T) => string,
): Promise<ProgressResult<R>> {
  const progress = new AsyncProgress(options);
  await progress.initialize();

  // Initialize platform tracking if enabled
  if (options.platformTracking && getPlatform) {
    const itemsWithPlatforms = items.map((item) => ({ platform: getPlatform(item) }));
    progress.initializePlatformTracking(itemsWithPlatforms);
  }

  const successful: R[] = [];
  const failed: Array<{ item: T; error: Error }> = [];

  // Process all items in parallel
  const promises = items.map(async (item) => {
    try {
      const result = await processor(item);
      const itemName = getItemName ? getItemName(item) : undefined;
      const platform = getPlatform ? getPlatform(item) : undefined;

      progress.reportSuccess(itemName, platform);
      return { success: true, result, item };
    } catch (error) {
      const itemName = getItemName ? getItemName(item) : undefined;
      const platform = getPlatform ? getPlatform(item) : undefined;

      progress.reportFailure(itemName, platform, error as Error);
      return { success: false, error: error as Error, item };
    }
  });

  // Wait for all promises to settle
  const results = await Promise.allSettled(promises);

  // Process results
  results.forEach((result) => {
    if (result.status === "fulfilled" && result.value) {
      if (result.value.success && result.value.result !== undefined) {
        successful.push(result.value.result);
      } else if (!result.value.success && result.value.error) {
        failed.push({ item: result.value.item, error: result.value.error });
      }
    }
  });

  await progress.complete();

  return {
    successful,
    failed,
    platformResults: progress.getPlatformResults(),
  };
}
