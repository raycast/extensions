import fs from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";

export class StorageError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

class StorageService {
  public readonly recordingsDir: string;

  constructor() {
    this.recordingsDir = path.join(environment.supportPath, "recordings");
  }

  async ensureRecordingsDir(): Promise<void> {
    try {
      await fs.promises.mkdir(this.recordingsDir, { recursive: true });
    } catch (err) {
      throw new StorageError("Failed to create recordings directory.", err);
    }
  }

  getRecordingFilename(): string {
    return "recording.wav";
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new StorageError(`Failed to delete file: ${filePath}`, err);
      }
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.size;
    } catch (err) {
      throw new StorageError(`Failed to get file size: ${filePath}`, err);
    }
  }
}

export const storageService = new StorageService();
