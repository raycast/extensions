import { environment } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";

function ensureDir(dirPath: string): string {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function getSupportDirectory(): string {
  return ensureDir(environment.supportPath);
}

export function getDatabasePath(): string {
  return path.join(getSupportDirectory(), "cache.db");
}

export function getWorkerPath(): string {
  const candidates = [path.join(environment.assetsPath, "sync-worker.js"), path.resolve(process.cwd(), "assets", "sync-worker.js")];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Could not locate sync worker. Looked in: ${candidates.join(", ")}`);
  }

  return found;
}
