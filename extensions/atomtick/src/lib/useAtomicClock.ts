import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { AtomicOffset, ensureSynced, getAtomicNow, getLastOffset, resync } from "./ntp";

interface NtpSyncState {
  offset: AtomicOffset | undefined;
  isSyncing: boolean;
  error: string | undefined;
  resync: () => Promise<void>;
}

/** Shared NTP sync bootstrapping: syncs on mount, exposes status and a manual resync trigger. */
function useNtpSync(): NtpSyncState {
  const [offset, setOffset] = useState<AtomicOffset | undefined>(() => getLastOffset());
  const [isSyncing, setIsSyncing] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const mounted = useRef(true);

  const runSync = useCallback(async (fn: () => Promise<AtomicOffset>) => {
    setIsSyncing(true);
    try {
      const result = await fn();
      if (!mounted.current) return;
      setOffset(result);
      setError(undefined);
    } catch (err) {
      if (!mounted.current) return;
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "NTP sync failed", message });
    } finally {
      if (mounted.current) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void runSync(ensureSynced);
    return () => {
      mounted.current = false;
    };
  }, [runSync]);

  const forceResync = useCallback(() => runSync(resync), [runSync]);

  return { offset, isSyncing, error, resync: forceResync };
}

export interface AtomicClockState extends NtpSyncState {
  /** Current atomic time in ms since epoch, ticking at `tickMs`. */
  now: number;
}

/** Ticks a live clock derived from the NTP-corrected atomic time on a fixed interval. */
export function useAtomicClock(tickMs = 1000): AtomicClockState {
  const sync = useNtpSync();
  const [now, setNow] = useState<number>(() => getAtomicNow());

  useEffect(() => {
    const interval = setInterval(() => setNow(getAtomicNow()), tickMs);
    return () => clearInterval(interval);
  }, [tickMs]);

  return { now, ...sync };
}
