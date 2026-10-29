import { createDownloadHistory, reconcileHistory, type DownloadRecord } from "@chrismessina/raycast-downloader/history";
import { clearStatus } from "@chrismessina/raycast-downloader/status";
import { LocalStorage } from "@raycast/api";
import { logInfo } from "./logger";

export type DownloadHistoryItem = DownloadRecord<{ url?: string }>;

/**
 * Download history, backed by the package's store rather than a hand-rolled one.
 *
 * The store matters more now that transfers are detached: a download that lands
 * after the Raycast window closes has no command left to record it, so
 * `reconcileHistory` sweeps the runner's status files into history on next open.
 * Without that, every background completion would be missing from the list.
 */
const history = createDownloadHistory<{ url?: string }>({
  key: "download-history",
  limit: 100,
  storage: {
    getItem: (key) => LocalStorage.getItem<string>(key),
    setItem: (key, value) => LocalStorage.setItem(key, value),
    removeItem: (key) => LocalStorage.removeItem(key),
  },
  // Signed URLs carry credentials in the query string and expire; keeping one in
  // history offers a "Download Again" that leaks a token and fails anyway.
  urlPolicy: "omit-signed",
});

export async function getDownloadHistory(): Promise<DownloadHistoryItem[]> {
  // Fold in anything the detached runners finished while no command was open.
  const swept = await reconcileHistory(history);
  if (swept > 0) logInfo("Reconciled detached downloads into history", { count: swept });
  return history.list();
}

export async function addToHistory(item: Omit<DownloadHistoryItem, "timestamp">): Promise<void> {
  await history.add(item);
  forgetStatuses([item.id]);
}

export async function addBatchToHistory(items: Array<Omit<DownloadHistoryItem, "timestamp">>): Promise<void> {
  await history.addMany(items);
  forgetStatuses(items.map((item) => item.id));
}

/**
 * Drop the runner status behind a row this command just recorded itself.
 *
 * `reconcileHistory` rewrites a row from its status file, and a status file has no
 * URL (it is kept off disk on purpose). Left in place, the next sweep replaced
 * this row with a URL-less copy, which hid Retry and Download Again on every entry.
 * The sweep is for downloads no command recorded (one that finished with no command
 * open, or a started batch item that was canceled).
 */
function forgetStatuses(ids: string[]): void {
  for (const id of ids) {
    try {
      clearStatus(id);
    } catch {
      // Best effort: a status that cannot be cleared only costs that row its URL.
    }
  }
}

export async function removeFromHistory(id: string): Promise<void> {
  await history.remove(id);
}

export async function clearHistory(): Promise<void> {
  await history.clear();
  logInfo("Cleared download history");
}

export async function clearHistoryByAge(minutes: number): Promise<number> {
  const cutoff = Date.now() - minutes * 60 * 1000;
  const recent = (await history.list()).filter((item) => item.timestamp > cutoff);
  for (const item of recent) await history.remove(item.id);
  logInfo("Cleared history by age", { minutes, removedCount: recent.length });
  return recent.length;
}
