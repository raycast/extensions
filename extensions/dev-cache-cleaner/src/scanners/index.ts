import type { ScanResult } from "../types";
import { scanPackageCaches } from "./package-caches";
import { scanXcode } from "./xcode";
import { scanLanguageCaches } from "./language-caches";
import { scanDocker } from "./docker";
import { scanProjectArtifacts } from "./project-artifacts";
import { scanSystem } from "./system";

/**
 * Run all scanners in parallel. Individual scanners can still fail independently
 * (each has its own try/catch internally) without affecting the others.
 */
export async function scanAll(onProgress?: (step: string) => void): Promise<ScanResult[]> {
  onProgress?.("Scanning caches...");

  const settled = await Promise.allSettled([
    scanPackageCaches(),
    scanProjectArtifacts(),
    scanXcode(),
    scanDocker(),
    scanLanguageCaches(),
    scanSystem(),
  ]);

  const results: ScanResult[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") results.push(...s.value);
  }
  return results;
}
