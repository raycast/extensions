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

function getCacheKey(filePath: string, mtimeMs: number): string {
  return crypto.createHash("md5").update(`${filePath}:${mtimeMs}`).digest("hex");
}

export function getCachedThumbnailPath(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    const cacheKey = getCacheKey(filePath, stats.mtimeMs);
    const cachedPath = path.join(getThumbnailCacheDirectory(), `${cacheKey}.png`);
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
      const cacheKey = getCacheKey(filePath, stats.mtimeMs);
      const finalThumbnailPath = path.join(cacheDir, `${cacheKey}.png`);

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
          await fs.promises.rename(expectedGeneratedFile, finalThumbnailPath);
          return finalThumbnailPath;
        }

        const generatedFiles = await fs.promises.readdir(tempDir);
        const pngCandidate = generatedFiles.find((f) => f.endsWith(".png"));
        if (pngCandidate) {
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
