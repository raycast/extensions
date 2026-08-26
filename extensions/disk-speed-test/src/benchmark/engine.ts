import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { BenchmarkEvent, BenchmarkResult, parseBenchmarkEvent, parseBenchmarkResult } from "./protocol";

export interface NativeBenchmarkBridge {
  runBenchmark(
    testIdentifier: string,
    temporaryFileIdentifier: string,
    directory: string,
    maxBytes: number,
    warmupBytes: number,
    targetDurationSeconds: number,
    chunkSizeBytes: number,
    progressFilePath: string,
    cancellationFilePath: string,
  ): Promise<unknown>;
}

export interface BenchmarkRunConfiguration {
  directory: string;
  maxBytes: number;
  warmupBytes: number;
  targetDurationSeconds: number;
  chunkSizeBytes: number;
}

export interface BenchmarkRunObserver {
  onEvent?: (event: BenchmarkEvent) => void;
  signal?: AbortSignal;
}

export interface BenchmarkEngine {
  run(configuration: BenchmarkRunConfiguration, observer?: BenchmarkRunObserver): Promise<BenchmarkResult>;
}

export class NativeBenchmarkEngine implements BenchmarkEngine {
  constructor(
    private readonly bridge: NativeBenchmarkBridge,
    private readonly progressPollingMilliseconds = 100,
  ) {}

  async run(configuration: BenchmarkRunConfiguration, observer: BenchmarkRunObserver = {}): Promise<BenchmarkResult> {
    if (observer.signal?.aborted) throw new BenchmarkCancelledError();

    const temporaryFileIdentifier = randomUUID().toUpperCase();
    const temporaryFilePath = path.join(
      configuration.directory,
      `.raycast-disk-speed-v1-${temporaryFileIdentifier}.tmp`,
    );
    const transportDirectory = await mkdtemp(path.join(tmpdir(), "raycast-disk-speed-"));
    const progressFilePath = path.join(transportDirectory, "progress.json");
    const cancellationFilePath = path.join(transportDirectory, "cancel");
    let lastProgressSnapshot = "";
    let progressError: Error | undefined;
    let progressRead = Promise.resolve();

    const requestCancellation = () => {
      try {
        writeFileSync(cancellationFilePath, "", { flag: "wx", mode: 0o600 });
      } catch (error) {
        if (!isNodeError(error) || error.code !== "EEXIST") {
          progressError ??= error instanceof Error ? error : new Error(String(error));
        }
      }
    };

    const readProgress = () => {
      progressRead = progressRead.then(async () => {
        if (progressError) return;
        try {
          const snapshot = await readFile(progressFilePath, "utf8");
          if (snapshot === lastProgressSnapshot) return;
          lastProgressSnapshot = snapshot;
          const event = parseBenchmarkEvent(snapshot.trim());
          observer.onEvent?.(event);
        } catch (error) {
          if (!isNodeError(error) || error.code !== "ENOENT") {
            progressError = error instanceof Error ? error : new Error(String(error));
            requestCancellation();
          }
        }
      });
      return progressRead;
    };

    const abort = () => requestCancellation();
    observer.signal?.addEventListener("abort", abort, { once: true });
    if (observer.signal?.aborted) requestCancellation();

    const progressTimer = setInterval(() => void readProgress(), this.progressPollingMilliseconds);
    progressTimer.unref();

    let result: BenchmarkResult | undefined;
    let failure: Error | undefined;
    try {
      const value = await this.bridge.runBenchmark(
        "sequential",
        temporaryFileIdentifier,
        configuration.directory,
        configuration.maxBytes,
        configuration.warmupBytes,
        configuration.targetDurationSeconds,
        configuration.chunkSizeBytes,
        progressFilePath,
        cancellationFilePath,
      );
      await readProgress();

      if (observer.signal?.aborted) throw new BenchmarkCancelledError();
      if (progressError) throw progressError;

      result = parseBenchmarkResult(value);
      observer.onEvent?.({ protocolVersion: 1, type: "completed", result });
    } catch (error) {
      if (observer.signal?.aborted || error instanceof BenchmarkCancelledError) {
        failure = new BenchmarkCancelledError();
      } else if (progressError) {
        failure = new BenchmarkHelperError("invalid_progress", progressError.message);
      } else if (error instanceof BenchmarkHelperError) {
        failure = error;
      } else {
        failure = new BenchmarkHelperError("benchmark_failed", errorMessage(error));
      }
    }

    clearInterval(progressTimer);
    observer.signal?.removeEventListener("abort", abort);

    let cleanupError: unknown;
    try {
      await removeTemporaryFile(temporaryFilePath);
    } catch (error) {
      cleanupError = error;
    }
    try {
      await rm(transportDirectory, { recursive: true, force: true });
    } catch (error) {
      cleanupError ??= error;
    }

    if (cleanupError) {
      throw new BenchmarkHelperError("cleanup_failed", "Unable to remove temporary benchmark data");
    }
    if (failure) throw failure;
    if (!result) throw new BenchmarkHelperError("missing_result", "Swift returned no benchmark result");
    return result;
  }
}

async function removeTemporaryFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return;
    throw error;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return String(error);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export class BenchmarkCancelledError extends Error {
  constructor() {
    super("Benchmark cancelled");
    this.name = "BenchmarkCancelledError";
  }
}

export class BenchmarkHelperError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BenchmarkHelperError";
  }
}
