import { environment, getPreferenceValues } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { newId } from "./ids";
import type { HistoryItem, Preferences, Snippet, SnippetFolder } from "./types";

const HISTORY_FILE = "history.json";
const SNIPPETS_FILE = "snippets.json";

export { newId };

export function filePath(name: string) {
  if (!existsSync(environment.supportPath)) mkdirSync(environment.supportPath, { recursive: true });
  return join(environment.supportPath, name);
}

export function readJson<T>(name: string, fallback: T): T {
  try {
    const path = filePath(name);
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Write to a temp file and rename, so readers never see a half-written file. */
export function writeJson(name: string, data: unknown) {
  const path = filePath(name);
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, path);
}

export function getNumberPref(
  key: "maxHistory" | "itemsPerFolder" | "itemsInline" | "maxTitleLength",
  fallback: number,
  min = 1,
) {
  const prefs = getPreferenceValues<Preferences>();
  const n = parseInt(prefs[key] ?? "", 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

/** Same mkdir-based lock as helper.js. Locks older than 3 seconds are treated as stale. */
function withLock<T>(fn: () => T): T {
  const lock = filePath("history.lock");
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    try {
      mkdirSync(lock);
      try {
        return fn();
      } finally {
        rmSync(lock, { recursive: true, force: true });
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(lock).mtimeMs > 3000) rmSync(lock, { recursive: true, force: true });
      } catch {
        // already gone
      }
      const until = Date.now() + 15;
      while (Date.now() < until) {
        /* busy wait: this API is synchronous */
      }
    }
  }
  return fn();
}

function dropImages(items: HistoryItem[]) {
  for (const i of items) {
    if (i.imagePath && existsSync(i.imagePath)) {
      try {
        unlinkSync(i.imagePath);
      } catch {
        // ignore
      }
    }
  }
}

// ---------- History (recorded by helper.js; read and deleted here) ----------

export function loadHistory(): HistoryItem[] {
  const h = readJson<HistoryItem[]>(HISTORY_FILE, []);
  return Array.isArray(h) ? h : [];
}

export function removeHistoryItem(id: string) {
  withLock(() => {
    const h = loadHistory();
    dropImages(h.filter((x) => x.id === id));
    writeJson(
      HISTORY_FILE,
      h.filter((x) => x.id !== id),
    );
  });
}

export function clearHistory() {
  withLock(() => {
    dropImages(loadHistory());
    writeJson(HISTORY_FILE, []);
  });
}

// ---------- Snippets ----------

export function loadFolders(): SnippetFolder[] {
  return readJson<SnippetFolder[]>(SNIPPETS_FILE, []);
}

export function saveFolders(folders: SnippetFolder[]) {
  writeJson(SNIPPETS_FILE, folders);
}

export function upsertFolder(folder: Pick<SnippetFolder, "title"> & Partial<SnippetFolder>) {
  const folders = loadFolders();
  const idx = folder.id ? folders.findIndex((f) => f.id === folder.id) : -1;
  if (idx >= 0) {
    folders[idx] = { ...folders[idx], ...folder } as SnippetFolder;
  } else {
    folders.push({ id: newId(), enabled: true, snippets: [], ...folder } as SnippetFolder);
  }
  saveFolders(folders);
}

export function deleteFolder(folderId: string) {
  saveFolders(loadFolders().filter((f) => f.id !== folderId));
}

export function upsertSnippet(folderId: string, snippet: Omit<Snippet, "id"> & { id?: string }) {
  const folders = loadFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) throw new Error("Folder not found");
  const idx = snippet.id ? folder.snippets.findIndex((s) => s.id === snippet.id) : -1;
  if (idx >= 0) folder.snippets[idx] = { ...folder.snippets[idx], ...snippet } as Snippet;
  else folder.snippets.push({ ...snippet, id: newId() });
  saveFolders(folders);
}

export function deleteSnippet(folderId: string, snippetId: string) {
  const folders = loadFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (folder) folder.snippets = folder.snippets.filter((s) => s.id !== snippetId);
  saveFolders(folders);
}

function move<T>(arr: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function moveFolder(folderId: string, delta: -1 | 1) {
  const folders = loadFolders();
  const i = folders.findIndex((f) => f.id === folderId);
  saveFolders(move(folders, i, i + delta));
}

export function moveSnippet(folderId: string, snippetId: string, delta: -1 | 1) {
  const folders = loadFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;
  const i = folder.snippets.findIndex((s) => s.id === snippetId);
  folder.snippets = move(folder.snippets, i, i + delta);
  saveFolders(folders);
}
