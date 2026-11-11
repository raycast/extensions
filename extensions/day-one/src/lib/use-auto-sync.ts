import { useEffect, useRef, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { failToast, syncWithToast } from "./feedback";
import { isSyncRunning, lastSyncStartedAt, syncAndWait } from "./sync";

const log = logger.child("[auto-sync]");

/** A list older than this gets a quiet background sync when a command opens. */
const STALE_AFTER_MS = 15 * 60 * 1000;

/**
 * Keeps journals fresh without asking. When there are no journals yet (a new install), it syncs right away behind
 * a toast, since there is nothing to show until it finishes. Otherwise it shows what's on disk and, if the last
 * sync from this extension is stale, syncs in the background with the list's loading bar, then refreshes.
 * Runs once per mount.
 */
export function useAutoSync(options: { ready: boolean; empty: boolean; onSynced: () => void }): { isSyncing: boolean } {
  const [isSyncing, setIsSyncing] = useState(false);
  const started = useRef(false);
  const onSynced = useRef(options.onSynced);
  onSynced.current = options.onSynced;

  useEffect(() => {
    if (!options.ready || started.current) return;
    // A sync already running (started by a command you closed, or another command) is joined, not skipped,
    // so this view still refreshes when it finishes.
    const running = isSyncRunning();
    const last = lastSyncStartedAt();
    const stale = last === null || Date.now() - last > STALE_AFTER_MS;
    log.debug("checked", {
      empty: options.empty,
      stale,
      running,
      lastSyncMinutesAgo: last && Math.round((Date.now() - last) / 60_000),
    });
    if (!options.empty && !stale && !running) return;
    started.current = true;
    setIsSyncing(true);
    const run =
      options.empty && !running
        ? syncWithToast({ title: "Downloading Your Journals…" })
        : syncAndWait().catch((error) => failToast(error, "Couldn't Sync Day One"));
    run.then(() => onSynced.current()).finally(() => setIsSyncing(false));
  }, [options.ready, options.empty]);

  return { isSyncing };
}
