import * as fs from "fs";
import { exec, ChildProcess } from "child_process";
import { getOrDownloadFile } from "./file";
import { log } from "./log";

/**
 * Playback state manager using singleton pattern
 */
class PlaybackStateManager {
  private static instance: PlaybackStateManager;
  private sampleId: string | null = null;
  private tempPath: string | undefined = undefined;
  private playbackProcess: ChildProcess | null = null;
  private listeners = new Set<(sampleId: string | null) => void>();
  private playbackQueue: Promise<void> = Promise.resolve();

  static getInstance(): PlaybackStateManager {
    if (!PlaybackStateManager.instance) {
      PlaybackStateManager.instance = new PlaybackStateManager();
    }
    return PlaybackStateManager.instance;
  }

  subscribe(listener: (sampleId: string | null) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.sampleId);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.sampleId));
  }

  getCurrentSampleId(): string | null {
    return this.sampleId;
  }

  getCurrentTempPath(): string | undefined {
    return this.tempPath;
  }

  setPlaybackProcess(process: ChildProcess | null) {
    this.playbackProcess = process;
  }

  setPlayingState(sampleId: string | null, tempPath?: string) {
    const wasPlaying = this.sampleId !== null;
    const previousSampleId = this.sampleId;
    const isNowPlaying = sampleId !== null;
    this.sampleId = sampleId;
    this.tempPath = tempPath;

    if (isNowPlaying) {
      log.debug(`[audio] playback state: playing sampleId=${sampleId}, tempPath=${tempPath}`);
    } else if (wasPlaying) {
      log.debug(`[audio] playback state: stopped (was playing sampleId=${previousSampleId})`);
    }

    this.notifyListeners();
  }

  // Serialize playback operations to prevent race conditions
  async enqueuePlayback<T>(operation: () => Promise<T>): Promise<T> {
    log.debug(`[audio] enqueueing playback operation`);
    const operationPromise = this.playbackQueue
      .then(() => {
        log.debug(`[audio] executing playback operation`);
        return operation();
      })
      .catch((error) => {
        log.debug(`[audio] playback operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        // Ignore errors in queue chain
        return undefined as unknown as T;
      });
    this.playbackQueue = operationPromise.then(() => {
      log.debug(`[audio] playback operation completed`);
      return undefined;
    });
    return operationPromise;
  }

  cleanup() {
    // Stop playback process if running
    if (this.playbackProcess) {
      log.debug(`[audio] killing playback process`);
      try {
        this.playbackProcess.kill("SIGTERM");
        this.playbackProcess = null;
      } catch (error) {
        log.debug(
          `[audio] failed to kill playback process: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    if (this.tempPath) {
      // Don't delete temp files immediately - they might be needed for drag and drop
      // Files in /tmp with our naming pattern are safe to leave - they'll be reused or cleaned by OS
      // Only log that we're clearing the reference
      log.debug(`[audio] clearing temp file reference: ${this.tempPath} (file left for potential reuse)`);
      this.tempPath = undefined;
    }
    if (this.sampleId) {
      log.debug(`[audio] cleanup: clearing sampleId=${this.sampleId}`);
    }
    this.sampleId = null;
    this.notifyListeners();
  }

  // Cleanup all resources when command unmounts
  destroy() {
    log.debug(`[audio] destroying playback manager (${this.listeners.size} listeners)`);
    this.cleanup();
    this.listeners.clear();
  }
}

/**
 * Play audio file using afplay (built-in macOS command-line audio player)
 * @param audioUrl The URL of the audio file
 * @param sampleId The sample ID for state tracking
 * @param sampleName The sample name for creating the temp file
 * @returns Promise that resolves when playback starts
 */
export async function playAudio(audioUrl: string, sampleId: string, sampleName: string): Promise<void> {
  const manager = PlaybackStateManager.getInstance();

  log.debug(`[audio] playAudio requested: sampleId=${sampleId}, url=${audioUrl}, name=${sampleName}`);

  await manager.enqueuePlayback(async () => {
    // Stop any currently playing audio first
    const currentPlaying = manager.getCurrentSampleId();
    if (currentPlaying) {
      log.debug(`[audio] stopping current playback (sampleId=${currentPlaying}) before starting new one`);
    }
    await stopAudio();

    try {
      log.debug(`[audio] getting/downloading file for playback: ${audioUrl}`);
      // Get or download the file (uses cache if available, with sanitized filename)
      const { path: filePath } = await getOrDownloadFile(audioUrl, "/tmp", sampleName);
      log.debug(`[audio] file ready for playback: ${filePath}`);

      // Verify file exists and is readable before launching afplay
      // This prevents race conditions where the file isn't fully written yet
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error(`File is empty: ${filePath}`);
      }

      log.debug(`[audio] verified file exists: ${filePath} (${stats.size} bytes)`);

      // Update state
      manager.setPlayingState(sampleId, filePath);

      log.debug(`[audio] launching afplay with file: ${filePath}`);

      // Use afplay to play the audio file
      // Escape the path properly for shell: escape single quotes, backslashes, and wrap in single quotes
      // This handles spaces, special characters, and prevents injection
      const escapedPath = filePath.replace(/'/g, "'\\''");
      const command = `afplay '${escapedPath}'`;

      return new Promise<void>((resolve, reject) => {
        const process = exec(command, (error, stdout, stderr) => {
          // Process completed (either finished playing or was killed)
          if (error) {
            // Only reject if it wasn't intentionally killed (SIGTERM)
            if (error.signal !== "SIGTERM" && error.code !== null) {
              log.debug(`[audio] afplay error: ${error.message}${stderr ? ` (stderr: ${stderr})` : ""}`);
              reject(error);
            } else {
              log.debug(`[audio] afplay stopped (signal: ${error.signal})`);
            }
          } else {
            log.debug(`[audio] afplay finished playing`);
          }

          // Clear playback state when done
          if (manager.getCurrentSampleId() === sampleId) {
            manager.cleanup();
          }
        });

        // Store process reference immediately (before resolve) to prevent race conditions
        manager.setPlaybackProcess(process);

        // Verify process started successfully by checking stderr
        // If there's an immediate error, stderr will contain it
        process.once("error", (processError) => {
          log.debug(`[audio] process spawn error: ${processError.message}`);
          manager.setPlaybackProcess(null);
          reject(processError);
        });

        // Resolve only after we've confirmed the process started
        // Give it a tiny delay to catch immediate errors
        setTimeout(() => {
          if (process.killed) {
            log.debug(`[audio] process was killed before starting`);
            reject(new Error("Process was killed before starting"));
          } else {
            log.debug(`[audio] playback started successfully: sampleId=${sampleId}`);
            resolve();
          }
        }, 50);
      });
    } catch (error) {
      log.debug(
        `[audio] playback failed: sampleId=${sampleId} - ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      // Update global state to stop playing
      manager.cleanup();
      throw error;
    }
  });
}

/**
 * Stop audio playback
 */
export async function stopAudio(): Promise<void> {
  const manager = PlaybackStateManager.getInstance();
  const currentSampleId = manager.getCurrentSampleId();

  if (currentSampleId) {
    log.debug(`[audio] stopAudio requested: sampleId=${currentSampleId}`);
  } else {
    log.debug(`[audio] stopAudio requested: no audio currently playing`);
    return;
  }

  // Cleanup will handle killing the process
  manager.cleanup();
  log.debug(`[audio] stopAudio completed: sampleId=${currentSampleId}`);
}

/**
 * Check if a sample is currently playing
 * @param sampleId The sample ID to check
 * @returns True if the sample is playing
 */
export function isPlaying(sampleId: string): boolean {
  const manager = PlaybackStateManager.getInstance();
  return manager.getCurrentSampleId() === sampleId;
}

// Export the manager for direct access if needed
export const getPlaybackManager = () => PlaybackStateManager.getInstance();

/**
 * Cleanup all playback resources (call on component unmount)
 */
export function cleanupPlayback(): void {
  log.debug(`[audio] cleanupPlayback called`);
  const manager = PlaybackStateManager.getInstance();
  manager.destroy();
}
