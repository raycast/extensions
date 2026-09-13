import {
  Cache,
  LocalStorage,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import path from "node:path";
import { RecentEntry, RecentScan, scanRecentFiles } from "./recent-files";
import { withIndexingLock } from "./indexing-lock";
import { setupProgress } from "./setup-progress";

export const RECENT_CACHE_LIMIT = 10_000;
const RECENT_CACHE_BYTES = 16_000_000;
const cache = new Cache({
  namespace: "recent-files",
  capacity: RECENT_CACHE_BYTES,
});
const KEY = "entries";
const SETUP_KEY = "recent-files-setup";

export function confirmRecentImport(): Promise<boolean> {
  return confirmAlert({
    title: "Populate from Recent Files?",
    message:
      "Use documents opened in the last seven days within your home folder, plus their parent folders and immediate contents. Only paths and metadata are stored, on this Mac. Your recorded usage is not changed.",
    primaryAction: { title: "Populate from Recent Files" },
    dismissAction: { title: "Cancel" },
  });
}

export async function needsRecentSetup(): Promise<boolean> {
  const choice = await LocalStorage.getItem(SETUP_KEY);
  return choice !== "done" && choice !== "skipped";
}

export async function skipRecentSetup(): Promise<boolean | undefined> {
  return withIndexingLock(async (assertOwned) => {
    assertOwned();
    await LocalStorage.setItem(SETUP_KEY, "skipped");
    return true;
  }, "recent-files");
}

export function loadRecentEntries(): RecentEntry[] {
  try {
    const entries: unknown = JSON.parse(cache.get(KEY) ?? "[]");
    if (!Array.isArray(entries)) return [];
    return entries
      .filter(
        (entry): entry is RecentEntry =>
          entry &&
          typeof entry.path === "string" &&
          path.isAbsolute(entry.path) &&
          typeof entry.name === "string" &&
          typeof entry.isDirectory === "boolean" &&
          (entry.recent === undefined || typeof entry.recent === "boolean") &&
          (entry.storagePath === undefined ||
            (typeof entry.storagePath === "string" &&
              path.isAbsolute(entry.storagePath))) &&
          [entry.lastUsedMs, entry.useCount, entry.dev, entry.ino].every(
            (value) =>
              value === undefined ||
              (typeof value === "number" &&
                Number.isFinite(value) &&
                value >= 0),
          ) &&
          [entry.size, entry.mtimeMs, entry.birthtimeMs].every(
            (value) => typeof value === "number" && Number.isFinite(value),
          ),
      )
      .slice(0, RECENT_CACHE_LIMIT);
  } catch {
    return [];
  }
}

export function clearRecentEntries(): number {
  const bytes = cache.get(KEY)?.length ?? 0;
  cache.clear({ notifySubscribers: false });
  return bytes;
}

/** Shares the indexing/deletion lock for every checkpoint and the setup marker. */
export async function populateRecentFiles(
  options: RecentSetupOptions = {},
): Promise<RecentScan | undefined> {
  return withIndexingLock(
    (assertOwned) => populateRecentFilesLocked(assertOwned, options),
    "recent-files",
  );
}

export type RecentSetupOptions = {
  signal?: AbortSignal;
  budgetMs?: number;
  metadataBudgetMs?: number;
  maxDocuments?: number;
  maxFolders?: number;
  maxPerFolder?: number;
  maxEntries?: number;
  onStatus?: (message: string) => void;
  onSummary?: (message: string) => void;
  onProgress?: (entries: RecentEntry[]) => void;
};

/** Caller holds the indexing lock for checkpoints and the setup choice. */
export async function populateRecentFilesLocked(
  assertOwned: () => void,
  options: RecentSetupOptions = {},
): Promise<RecentScan | undefined> {
  if (options.signal?.aborted) return undefined;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Populating from Recent Files…",
    message: "Reading last week's documents and their parent folders.",
  });
  const progress = setupProgress((message) => {
    toast.message = message;
    options.onStatus?.(message);
  });
  progress.phase("Recent files", options.budgetMs ?? 15_000);
  try {
    const previous = loadRecentEntries();
    const save = (result: RecentScan) => {
      if (options.signal?.aborted) return;
      assertOwned();
      const merged = new Map(
        result.entries.map((entry) => [entry.path, entry]),
      );
      for (const entry of previous)
        if (!merged.has(entry.path)) merged.set(entry.path, entry);
      const entries = [...merged.values()].slice(0, RECENT_CACHE_LIMIT);
      const serialized = JSON.stringify(entries);
      if (Buffer.byteLength(serialized, "utf8") > RECENT_CACHE_BYTES) {
        throw new Error("Recent-file cache exceeds its storage allowance");
      }
      cache.set(KEY, serialized);
      options.onProgress?.(entries);
      progress.update(`${result.entries.length} files and folders found`);
    };
    const result = await scanRecentFiles({
      signal: options.signal,
      budgetMs: options.budgetMs,
      metadataBudgetMs: options.metadataBudgetMs,
      maxDocuments: options.maxDocuments,
      maxFolders: options.maxFolders,
      maxPerFolder: options.maxPerFolder,
      maxEntries: options.maxEntries,
      onStatus: progress.update,
      onProgress: save,
    });
    if (result.cancelled || options.signal?.aborted) {
      toast.style = Toast.Style.Success;
      toast.title = "Recent-file import stopped";
      toast.message =
        "Any saved progress was kept. Run Populate from Recent Files to retry.";
      return result;
    }
    if (result.entries.length > 0) save(result);
    if (!result.error && (!result.partial || result.entries.length > 0)) {
      assertOwned();
      await LocalStorage.setItem(
        SETUP_KEY,
        result.partial ? "partial" : "done",
      );
    }
    toast.style = result.error ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = result.error
      ? "Recent-file import failed"
      : result.partial
        ? "Recent-file import is partial"
        : result.entries.length
          ? "Recent files are ready to search"
          : "No recent documents found";
    toast.message =
      result.error ??
      (result.partial
        ? `${result.entries.length} files and folders found. ${result.reasons?.join("; ") || "A scan limit or unreadable metadata left the import incomplete"}; saved progress was kept.`
        : `${result.entries.length} files and folders cached. Your recorded usage was not changed.`);
    options.onSummary?.("Recent files: " + toast.message);
    return result;
  } finally {
    progress.stop();
  }
}
