import { useCallback, useEffect, useMemo, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getActiveHost, getActiveHosts } from "./ssh-config";
import { detectUser } from "./slurm";

const EMPTY_USERS: Record<string, string> = Object.freeze({}) as Record<string, string>;
const EMPTY_ERRORS: Record<string, Error | undefined> = Object.freeze({}) as Record<string, Error | undefined>;

export function useActiveHost() {
  const [host, setHost] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const h = await getActiveHost();
    setHost((prev) => (prev === h ? prev : h));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { host, isLoading, reload };
}

export function useActiveHosts() {
  const [hosts, setHosts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const list = await getActiveHosts();
    // Avoid producing a fresh array reference when contents are unchanged —
    // otherwise every consumer's effects keyed on `hosts` re-fire needlessly.
    setHosts((prev) => (sameStringArray(prev, list) ? prev : list));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { hosts, isLoading, reload };
}

export function useSlurmUser(host: string | null) {
  const result = useCachedPromise(async (h: string) => detectUser(h), [host ?? ""], {
    execute: !!host,
    keepPreviousData: true,
  });
  return {
    user: (result.data ?? "").trim(),
    isLoading: result.isLoading,
    error: result.error as Error | undefined,
  };
}

/**
 * Detect the Slurm username on every active cluster in parallel.
 */
export function useSlurmUsers(hosts: string[]) {
  const key = useMemo(() => JSON.stringify(hosts), [hosts]);
  const result = useCachedPromise(
    async (k: string) => {
      const list = (JSON.parse(k) as string[]).filter(Boolean);
      const settled = await Promise.allSettled(list.map((h) => detectUser(h)));
      const users: Record<string, string> = {};
      const errors: Record<string, Error | undefined> = {};
      list.forEach((h, i) => {
        const r = settled[i];
        if (r.status === "fulfilled") {
          users[h] = r.value.trim();
        } else {
          errors[h] = r.reason instanceof Error ? r.reason : new Error(String(r.reason));
        }
      });
      return { users, errors };
    },
    [key],
    { execute: hosts.length > 0, keepPreviousData: true },
  );

  // Stable refs: keep the same empty objects when no data, and keep the
  // same nested objects from `result.data` rather than re-spreading them.
  return {
    users: result.data?.users ?? EMPTY_USERS,
    errors: result.data?.errors ?? EMPTY_ERRORS,
    isLoading: result.isLoading,
  };
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
