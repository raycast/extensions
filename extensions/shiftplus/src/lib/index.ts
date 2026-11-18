import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { open } from "@raycast/api";

export const INDEX_PATH = path.join(
  os.homedir(),
  "Library/Application Support/ShiftPlus/raycast-index.json",
);

export interface QuickLinkEntry {
  id: string;
  title: string;
  url: string;
  // v2 fields — absent in older index files; treat as optional
  appPath?: string | null;
  badgeLabel?: string | null;
  isPreset?: boolean;
}

export interface ProfileEntry {
  id: string;
  name: string;
  color: string;
  icon: string;
  browserType: string;
  appCount: number;
  quickLinks: QuickLinkEntry[];
}

export interface RaycastIndex {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  profiles: ProfileEntry[];
}

export async function readIndex(): Promise<RaycastIndex | null> {
  try {
    const data = fs.readFileSync(INDEX_PATH, "utf-8");
    const parsed = JSON.parse(data) as RaycastIndex;
    if (parsed.schemaVersion < 1 || parsed.schemaVersion > 2) {
      console.warn(
        `[ShiftPlus] Unknown schema version: ${parsed.schemaVersion}. Some features may not work correctly.`,
      );
    }
    return parsed;
  } catch {
    return null;
  }
}

export function watchIndex(callback: () => void): fs.FSWatcher | null {
  try {
    const dir = path.dirname(INDEX_PATH);
    if (!fs.existsSync(dir)) return null;
    return fs.watch(INDEX_PATH, { persistent: false }, () => {
      callback();
    });
  } catch {
    return null;
  }
}

export async function triggerExport(): Promise<void> {
  await open("shiftplus://export-index");
}

export function domainFromURL(rawURL: string): string {
  try {
    const u = new URL(rawURL);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return rawURL;
  }
}
