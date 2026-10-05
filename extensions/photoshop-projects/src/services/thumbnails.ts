import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const inFlightGenerations = new Map<string, Promise<string | null>>();

export function getThumbnailCacheDirectory(): string {
  const baseDir =
    typeof environment !== "undefined" && environment.supportPath
      ? environment.supportPath
      : path.join(os.homedir(), "Library/Application Support/com.raycast.macos/photoshop-projects");
  const cacheDir = path.join(baseDir, "thumbnails");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

function getPathHash(filePath: string): string {
  return crypto.createHash("md5").update(filePath).digest("hex").slice(0, 16);
}

function getThumbnailFileName(filePath: string, mtimeMs: number): string {
  const pathHash = getPathHash(filePath);
  return `${pathHash}_${Math.floor(mtimeMs)}.png`;
}

async function cleanOldThumbnailsForFile(filePath: string, currentFileName: string): Promise<void> {
  try {
    const cacheDir = getThumbnailCacheDirectory();
    const prefix = `${getPathHash(filePath)}_`;
    const entries = await fs.promises.readdir(cacheDir);
    for (const entry of entries) {
      if (entry.startsWith(prefix) && entry !== currentFileName && entry.endsWith(".png")) {
        await fs.promises.unlink(path.join(cacheDir, entry)).catch(() => {});
      }
    }
  } catch {
    // Ignore cache cleanup errors
  }
}

export function getCachedThumbnailPath(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    const fileName = getThumbnailFileName(filePath, stats.mtimeMs);
    const cachedPath = path.join(getThumbnailCacheDirectory(), fileName);
    return fs.existsSync(cachedPath) ? cachedPath : null;
  } catch {
    return null;
  }
}

export async function getOrGenerateThumbnail(filePath: string): Promise<string | null> {
  const existing = getCachedThumbnailPath(filePath);
  if (existing) return existing;

  const inFlight = inFlightGenerations.get(filePath);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      if (!fs.existsSync(filePath)) return null;
      const stats = await fs.promises.stat(filePath);
      const cacheDir = getThumbnailCacheDirectory();
      const fileName = getThumbnailFileName(filePath, stats.mtimeMs);
      const finalThumbnailPath = path.join(cacheDir, fileName);

      if (fs.existsSync(finalThumbnailPath)) {
        return finalThumbnailPath;
      }

      const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "psd-thumb-"));
      try {
        await execFileAsync("/usr/bin/qlmanage", ["-t", "-s", "512", "-o", tempDir, filePath], {
          timeout: 4000,
        });

        const baseName = path.basename(filePath);
        const expectedGeneratedFile = path.join(tempDir, `${baseName}.png`);

        if (fs.existsSync(expectedGeneratedFile)) {
          await cleanOldThumbnailsForFile(filePath, fileName);
          await fs.promises.rename(expectedGeneratedFile, finalThumbnailPath);
          return finalThumbnailPath;
        }

        const generatedFiles = await fs.promises.readdir(tempDir);
        const pngCandidate = generatedFiles.find((f) => f.endsWith(".png"));
        if (pngCandidate) {
          await cleanOldThumbnailsForFile(filePath, fileName);
          await fs.promises.rename(path.join(tempDir, pngCandidate), finalThumbnailPath);
          return finalThumbnailPath;
        }

        return null;
      } finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    } catch {
      return null;
    } finally {
      inFlightGenerations.delete(filePath);
    }
  })();

  inFlightGenerations.set(filePath, promise);
  return promise;
}
