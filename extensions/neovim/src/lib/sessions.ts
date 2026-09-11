import fs from "fs";
import path from "path";
import os from "os";
import { environment } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { SessionEntry, RecentDirEntry } from "./types";

const XDG_STATE_HOME = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local/state");
const SESSIONS_DIR = path.join(XDG_STATE_HOME, "nvim/sessions");
const RECENT_DIRS_PATH = path.join(environment.supportPath, "neovim-recent-dirs.json");

// persistence.nvim encodes path separators as % and literal % as %%
function decodeSessionFilename(filename: string): string {
  return filename
    .replace(/\.(vim|lua)$/, "")
    .replace(/^%/, "/")
    .replace(/%%/g, "\0") // temporarily replace literal %% with null
    .replace(/%/g, "/") // replace single % with /
    .replace(/\0/g, "%"); // restore literal %
}

function getPersistenceSessions(): SessionEntry[] {
  if (!fs.existsSync(SESSIONS_DIR)) return [];

  return fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".vim") || f.endsWith(".lua"))
    .map((f) => {
      const filePath = path.join(SESSIONS_DIR, f);
      const stat = fs.statSync(filePath);
      return {
        id: `persistence:${f}`,
        name: path.basename(decodeSessionFilename(f)),
        path: decodeSessionFilename(f),
        lastOpened: stat.mtime,
        source: "persistence" as const,
      };
    });
}

function getRecentDirs(): SessionEntry[] {
  if (!fs.existsSync(RECENT_DIRS_PATH)) return [];

  try {
    const data = fs.readFileSync(RECENT_DIRS_PATH, "utf-8");
    const entries: RecentDirEntry[] = JSON.parse(data);
    return entries.map((e) => ({
      id: `recent:${e.path}`,
      name: path.basename(e.path),
      path: e.path,
      lastOpened: new Date(e.lastOpened),
      source: "recent" as const,
    }));
  } catch {
    return [];
  }
}

function mergeSessions(...sources: SessionEntry[][]): SessionEntry[] {
  const seen = new Set<string>();
  const merged: SessionEntry[] = [];

  for (const source of sources) {
    for (const entry of source) {
      const key = entry.path;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(entry);
      }
    }
  }

  return merged.sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime());
}

export function useSessions() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const persistence = getPersistenceSessions();
    const recent = getRecentDirs();
    return mergeSessions(persistence, recent);
  });

  async function removeEntry(entry: SessionEntry) {
    if (entry.source !== "recent") return;
    const data = fs.readFileSync(RECENT_DIRS_PATH, "utf-8");
    const entries: RecentDirEntry[] = JSON.parse(data);
    const filtered = entries.filter((e) => e.path !== entry.path);
    fs.writeFileSync(RECENT_DIRS_PATH, JSON.stringify(filtered, null, 2));
    revalidate();
  }

  async function removeAllEntries() {
    if (fs.existsSync(RECENT_DIRS_PATH)) {
      fs.writeFileSync(RECENT_DIRS_PATH, "[]");
      revalidate();
    }
  }

  return { data, isLoading, error, removeEntry, removeAllEntries };
}

export function trackRecentDir(dirPath: string) {
  const dir = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory() ? dirPath : path.dirname(dirPath);

  let entries: RecentDirEntry[] = [];
  if (fs.existsSync(RECENT_DIRS_PATH)) {
    try {
      entries = JSON.parse(fs.readFileSync(RECENT_DIRS_PATH, "utf-8"));
    } catch {
      entries = [];
    }
  }

  const existing = entries.find((e) => e.path === dir);
  if (existing) {
    existing.lastOpened = new Date().toISOString();
    existing.openCount++;
  } else {
    entries.push({ path: dir, lastOpened: new Date().toISOString(), openCount: 1 });
  }

  entries.sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime());
  entries = entries.slice(0, 50);

  const dir2 = path.dirname(RECENT_DIRS_PATH);
  if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });
  fs.writeFileSync(RECENT_DIRS_PATH, JSON.stringify(entries, null, 2));
}
