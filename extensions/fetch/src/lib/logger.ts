import { Logger } from "@chrismessina/raycast-logger";

export interface LogContext {
  command?: string;
  url?: string;
  filename?: string;
  [key: string]: unknown;
}

/**
 * Structural subset of `DownloadProgress` from `./downloader`. Declared locally
 * rather than imported because `downloader` imports this module — importing back
 * would create a cycle.
 */
export interface LoggableProgress {
  percent: number;
  bytesDownloaded: number;
  totalBytes: number;
  speed: number;
  eta: number;
}

// No `isVerboseEnabled` override: the logger's default already reads the
// `verboseLogging` preference, which is why the manifest uses that exact name.
const logger = new Logger({
  prefix: "[Fetch]",
  showTimestamp: true,
  enableRedaction: true,
});

export function logDebug(message: string, context?: LogContext): void {
  logger.debug(message, context);
}

export function logInfo(message: string, context?: LogContext): void {
  logger.info(message, context);
}

export function logWarn(message: string, context?: LogContext): void {
  logger.warn(message, context);
}

export function logError(message: string, error?: Error, context?: LogContext): void {
  if (error) {
    logger.error(message, { ...context, error: error.message, stack: error.stack });
  } else {
    logger.error(message, context);
  }
}

export function logDownloadStart(url: string, outputPath: string): void {
  logInfo("Download started", { url, outputPath });
}

export function logDownloadProgress(url: string, progress: LoggableProgress): void {
  // Only log at milestones (25%, 50%, 75%) to avoid spam
  const milestones = [25, 50, 75];
  const percent = Math.floor(progress.percent);
  if (milestones.includes(percent)) {
    logDebug(`Download progress: ${percent}%`, {
      url,
      bytesDownloaded: progress.bytesDownloaded,
      totalBytes: progress.totalBytes,
      speed: progress.speed,
    });
  }
}

export function logDownloadComplete(url: string, result: { duration?: number; bytesDownloaded?: number }): void {
  logInfo("Download completed", {
    url,
    duration: result.duration,
    bytesDownloaded: result.bytesDownloaded,
  });
}

export function logDownloadError(url: string, error: string | Error): void {
  const errorMessage = error instanceof Error ? error.message : error;
  logError("Download failed", error instanceof Error ? error : undefined, {
    url,
    error: errorMessage,
  });
}

export { logger };
