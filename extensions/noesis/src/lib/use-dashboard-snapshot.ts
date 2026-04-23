import { useCallback, useEffect, useState } from "react";
import { readDashboardSnapshot, syncDashboardSnapshot } from "./queries";
import { DashboardSnapshot } from "./types";

interface UseDashboardSnapshotOptions {
  initialSnapshot?: DashboardSnapshot | null;
  syncOnMount?: boolean;
}

export function useDashboardSnapshot(
  options: UseDashboardSnapshotOptions = {},
) {
  const { initialSnapshot = null, syncOnMount = true } = options;
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(
    initialSnapshot,
  );
  const [isLoading, setIsLoading] = useState(initialSnapshot === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!force && snapshot === null) {
        setIsLoading(true);
      } else if (force) {
        setIsLoading(true);
      }

      if (!force) {
        const cached = await readDashboardSnapshot();
        setSnapshot((current) => current ?? cached);
      }

      if (!syncOnMount && !force) {
        setIsLoading(false);
        return;
      }

      try {
        const synced = await syncDashboardSnapshot({ force });
        setSnapshot(synced);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unknown error",
        );
        const cached = await readDashboardSnapshot();
        setSnapshot(cached);
      } finally {
        setIsLoading(false);
      }
    },
    [snapshot, syncOnMount],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (initialSnapshot === null) {
          const cached = await readDashboardSnapshot();
          if (!cancelled) {
            setSnapshot(cached);
          }
        }

        if (!syncOnMount) {
          if (!cancelled) {
            setIsLoading(false);
          }
          return;
        }

        const synced = await syncDashboardSnapshot();
        if (!cancelled) {
          setSnapshot(synced);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unknown error",
          );
          const cached = await readDashboardSnapshot();
          setSnapshot(cached);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [initialSnapshot, syncOnMount]);

  return {
    snapshot,
    isLoading,
    error,
    reload: load,
  };
}
