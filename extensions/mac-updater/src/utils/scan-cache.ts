import * as fs from "fs";
import * as path from "path";
import { environment } from "@raycast/api";
import { ScanResult } from "./coordinator";

const CACHE_FILE = "scan-cache-v2.json";
// How long to trust a cached scan before forcing a fresh fetch.
// We always refresh in the background — this is just for "is the cache too stale to even show".
const FRESH_TTL = 24 * 60 * 60 * 1000; // 24h

function cachePath(): string {
  return path.join(environment.supportPath, CACHE_FILE);
}

export function saveScanCache(scan: ScanResult): void {
  try {
    fs.mkdirSync(environment.supportPath, { recursive: true });
    fs.writeFileSync(cachePath(), JSON.stringify(scan));
  } catch {
    // ignore — cache is best-effort
  }
}

export function loadScanCache(): { scan: ScanResult; age: number } | null {
  const p = cachePath();
  try {
    if (!fs.existsSync(p)) return null;
    const stat = fs.statSync(p);
    const age = Date.now() - stat.mtimeMs;
    if (age > FRESH_TTL) return null;
    const raw = fs.readFileSync(p, "utf8");
    const scan = JSON.parse(raw) as ScanResult;
    // Sanity check the shape so a truncated file doesn't render garbage.
    if (!scan || !Array.isArray(scan.apps) || !Array.isArray(scan.unmanaged)) {
      throw new Error("Cache shape is invalid");
    }
    return { scan, age };
  } catch {
    // Corrupt or truncated cache file — delete it so the next scan writes a clean one.
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearScanCache(): void {
  try {
    fs.unlinkSync(cachePath());
  } catch {
    // ignore
  }
}
