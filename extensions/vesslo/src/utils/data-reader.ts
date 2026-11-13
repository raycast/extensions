import { constants, promises as fs } from "fs";
import { isAbsolute } from "path";
import { VessloData } from "../types";
import {
  DATA_PATH,
  MAX_EXPORT_BYTES,
  MalformedVessloDataError,
  parseVessloData,
} from "./data";
import {
  AppPathAvailability,
  assessUpdateCount,
  exportFreshnessReason,
  initialVessloDataState,
  reviewSnapshotReason,
  VessloDataState,
} from "./data-state";
import { readyHomebrewTargetCount } from "./homebrew-readiness";

export interface FileMetadata {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface VessloFileSystem {
  stat(path: string): Promise<FileMetadata>;
  readFile(path: string): Promise<string>;
}

export interface ReadOptions {
  force?: boolean;
}

interface ReaderOptions {
  path?: string;
  fileSystem?: VessloFileSystem;
  now?: () => number;
}

const defaultFileSystem: VessloFileSystem = {
  stat: (path) => fs.lstat(path),
  async readFile(path) {
    const handle = await fs.open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const before = await handle.stat();
      if (!before.isFile() || before.size > MAX_EXPORT_BYTES)
        throw new MalformedVessloDataError(
          "Vesslo export is not a regular file within the 64 MiB read limit.",
        );
      const chunks: Buffer[] = [];
      let size = 0;
      while (true) {
        const buffer = Buffer.allocUnsafe(
          Math.min(64 * 1024, MAX_EXPORT_BYTES + 1 - size),
        );
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
        if (bytesRead === 0) break;
        size += bytesRead;
        if (size > MAX_EXPORT_BYTES)
          throw new MalformedVessloDataError(
            "Vesslo export exceeds the 64 MiB read limit.",
          );
        chunks.push(buffer.subarray(0, bytesRead));
      }
      const after = await handle.stat();
      if (signature(before) !== signature(after))
        throw new Error(
          "Vesslo export changed during its bounded descriptor read.",
        );
      try {
        return new TextDecoder("utf-8", { fatal: true }).decode(
          Buffer.concat(chunks, size),
        );
      } catch {
        throw new MalformedVessloDataError("Vesslo export is not valid UTF-8.");
      }
    } finally {
      await handle.close();
    }
  },
};

function signature(stat: FileMetadata): string {
  return [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(":");
}

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return typeof error.code === "string" ? error.code : undefined;
  }
  return undefined;
}

function failure(error: unknown): Pick<VessloDataState, "status" | "reason"> {
  if (error instanceof MalformedVessloDataError) {
    return { status: "malformed", reason: error.message };
  }
  switch (errorCode(error)) {
    case "ENOENT":
    case "ENOTDIR":
      return {
        status: "missing",
        reason:
          "Vesslo export is missing. Open Vesslo to create a fresh export.",
      };
    case "EACCES":
    case "EPERM":
      return {
        status: "permissionDenied",
        reason: "Vesslo export cannot be read because access was denied.",
      };
    default:
      return {
        status: "ioError",
        reason:
          "Vesslo export could not be read consistently. Retry or refresh in Vesslo.",
      };
  }
}

/** One reader owns its snapshot; late responses cannot replace a newer read. */
export class VessloDataReader {
  private readonly path: string;
  private readonly fileSystem: VessloFileSystem;
  private readonly now: () => number;
  private state = initialVessloDataState();
  private cached: { signature: string; data: VessloData } | null = null;
  private generation = 0;
  private pending: Promise<VessloDataState> | null = null;
  private disposed = false;

  constructor(options: ReaderOptions = {}) {
    this.path = options.path ?? DATA_PATH;
    this.fileSystem = options.fileSystem ?? defaultFileSystem;
    this.now = options.now ?? Date.now;
  }

  getState(): VessloDataState {
    return this.state;
  }

  dispose(): void {
    this.disposed = true;
    this.generation += 1;
  }

  read(options: ReadOptions = {}): Promise<VessloDataState> {
    if (this.disposed) return Promise.resolve(this.state);
    const generation = ++this.generation;
    const pending = this.readSnapshot(options).then((snapshot) => {
      if (this.disposed) return this.state;
      if (generation !== this.generation) return this.pending ?? this.state;
      this.state = snapshot.state;
      this.cached = snapshot.cache;
      return this.state;
    });
    this.pending = pending;
    return pending;
  }

  private async readSnapshot(options: ReadOptions): Promise<{
    state: VessloDataState;
    cache: { signature: string; data: VessloData } | null;
  }> {
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const snapshot = await this.readStableExport(options.force === true);
        const pathAvailability = await this.readPathAvailability(snapshot.data);
        const finalStat = await this.fileSystem.stat(this.path);
        if (!finalStat.isFile() || signature(finalStat) !== snapshot.signature)
          continue;
        const checkedAt = this.now();
        const reason = exportFreshnessReason(
          snapshot.data.exportedAt,
          checkedAt,
        );
        const updateCountAssessment = assessUpdateCount(snapshot.data);
        const contractMismatch = updateCountAssessment.status === "mismatch";
        return {
          state: {
            status: contractMismatch
              ? "contractMismatch"
              : reason
                ? "stale"
                : "ready",
            data: snapshot.data,
            reason: contractMismatch ? updateCountAssessment.reason : reason,
            checkedAt,
            pathAvailability,
            updateCountAssessment,
            reviewReadinessReason: reviewSnapshotReason(
              snapshot.data,
              checkedAt,
            ),
            homebrewReadyTargetCount:
              snapshot.data.schemaVersion === 3
                ? readyHomebrewTargetCount(snapshot.data, checkedAt)
                : undefined,
          },
          cache: snapshot,
        };
      }
      throw new Error("Vesslo export changed during app path validation.");
    } catch (error) {
      return {
        state: {
          ...this.state,
          ...failure(error),
          checkedAt: this.now(),
          homebrewReadyTargetCount: 0,
        },
        cache: null,
      };
    }
  }

  private async readStableExport(
    force: boolean,
  ): Promise<{ signature: string; data: VessloData }> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const before = await this.fileSystem.stat(this.path);
      if (!before.isFile())
        throw new MalformedVessloDataError(
          "Vesslo export is not a regular file.",
        );
      if (
        !Number.isSafeInteger(before.size) ||
        before.size < 0 ||
        before.size > MAX_EXPORT_BYTES
      )
        throw new MalformedVessloDataError(
          "Vesslo export exceeds the 64 MiB read limit or has an invalid size.",
        );
      const beforeSignature = signature(before);
      if (!force && this.cached?.signature === beforeSignature)
        return this.cached;

      const content = await this.fileSystem.readFile(this.path);
      let after: FileMetadata;
      try {
        after = await this.fileSystem.stat(this.path);
      } catch (error) {
        // An atomic writer may briefly remove the path before installing its replacement.
        if (errorCode(error) === "ENOENT" && attempt < 2) continue;
        throw error;
      }
      if (!after.isFile() || beforeSignature !== signature(after)) continue;
      return { signature: beforeSignature, data: parseVessloData(content) };
    }
    throw new Error("Vesslo export kept changing while it was read.");
  }

  private async readPathAvailability(
    data: VessloData,
  ): Promise<Record<string, AppPathAvailability>> {
    const availability: Record<string, AppPathAvailability> =
      Object.create(null);
    const paths = [
      ...new Set(
        data.apps.filter((app) => !app.isDeleted).map((app) => app.path),
      ),
    ];
    let index = 0;
    const worker = async () => {
      while (index < paths.length) {
        const path = paths[index++];
        if (
          !isAbsolute(path) ||
          path.includes("\0") ||
          !/\.app\/?$/i.test(path)
        ) {
          availability[path] = "unknown";
          continue;
        }
        try {
          const stat = await this.fileSystem.stat(path);
          availability[path] = stat.isDirectory() ? "available" : "missing";
        } catch (error) {
          const code = errorCode(error);
          availability[path] =
            code === "ENOENT" || code === "ENOTDIR"
              ? "missing"
              : code === "EACCES" || code === "EPERM"
                ? "permissionDenied"
                : "unknown";
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(16, paths.length) }, worker),
    );
    return availability;
  }
}

const currentDataReader = new VessloDataReader();

/** Action handlers use a fresh disk read, never a captured render snapshot. */
export function readCurrentVessloData(
  options: ReadOptions = { force: true },
): Promise<VessloDataState> {
  return currentDataReader.read(options);
}
