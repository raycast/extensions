import { getLogEvents, matchSessions } from "./focus-logs";
import { getLastSyncedAt, getStoredSessions, setLastSyncedAt, setStoredSessions } from "./storage";

export type SyncResult =
  | { didRun: false }
  | { didRun: true; added: number; skipped: number }
  | { didRun: true; error: Error };

const FIRST_SYNC_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
/** Overlap when resyncing so we don't miss sessions that started just before lastSyncedAt. */
const SYNC_OVERLAP_MS = 60 * 60 * 1000; // 1 hour

/**
 * Runs sync: log → match → merge into storage. No toasts; caller handles UI.
 * @param throttleMs If set and last sync was within this many ms, skip and return { didRun: false }.
 */
export async function runSync(options?: { throttleMs?: number }): Promise<SyncResult> {
  try {
    const lastSyncedAtStr = await getLastSyncedAt();

    if (options?.throttleMs && lastSyncedAtStr) {
      const lastMs = new Date(lastSyncedAtStr).getTime();
      if (Date.now() - lastMs < options.throttleMs) {
        return { didRun: false };
      }
    }

    const startDate = lastSyncedAtStr
      ? new Date(new Date(lastSyncedAtStr).getTime() - SYNC_OVERLAP_MS)
      : new Date(Date.now() - FIRST_SYNC_DAYS_MS);

    const events = getLogEvents(startDate);
    const newSessions = matchSessions(events);

    if (newSessions.length === 0) {
      // No new sessions; advance cursor so we don't re-scan this range next time.
      await setLastSyncedAt(new Date().toISOString());
      return { didRun: true, added: 0, skipped: 0 };
    }

    const existing = await getStoredSessions();
    const seen = new Set(existing.map((s) => `${s.start}\0${s.goal}`));
    let added = 0;
    for (const s of newSessions) {
      if (s.duration <= 1) continue;

      const key = `${s.start}\0${s.goal}`;
      if (seen.has(key)) continue;
      seen.add(key);
      existing.push(s);
      added += 1;
    }
    const combined = existing
      .filter((s) => s.duration > 1)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    await setStoredSessions(combined);
    // Only advance cursor after successful write; on throw we do not update lastSyncedAt (partial sync / crash safe).
    await setLastSyncedAt(new Date().toISOString());

    const skipped = newSessions.length - added;
    return { didRun: true, added, skipped };
  } catch (err) {
    // Do not update lastSyncedAt on failure; next sync will retry from same cursor.
    return {
      didRun: true,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
