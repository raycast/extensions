/**
 * Runs sequential cleanup (merged output removal) across selected events.
 *
 * @module hooks/use-cleanup-runner
 */

import { useCallback, useState } from "react";
import { buildCleanupRunResult, cleanupEventMergedDir } from "../lib/cleanup-merged";
import type { CleanupEventResult, CleanupRunResult, TeslaEvent } from "../types";

type EventStatusMap = Map<string, CleanupEventResult>;

/** Return value of {@link useCleanupRunner}. */
type UseCleanupRunnerResult = {
  readonly isCleaning: boolean;
  readonly eventStatuses: EventStatusMap;
  readonly cleaningEventId: string | undefined;
  readonly cleanupProgress: { readonly completed: number; readonly total: number };
  readonly cleanupAll: (events: readonly TeslaEvent[], outputRootPath?: string) => Promise<CleanupRunResult>;
};

/**
 * Manages in-progress cleanup state and executes `cleanupAll` over a list of events.
 *
 * @returns Cleanup state map, progress, flags, and `cleanupAll` runner function.
 */
export function useCleanupRunner(): UseCleanupRunnerResult {
  const [isCleaning, setIsCleaning] = useState(false);
  const [eventStatuses, setEventStatuses] = useState<EventStatusMap>(new Map());
  const [cleaningEventId, setCleaningEventId] = useState<string | undefined>();
  const [cleanupProgress, setCleanupProgress] = useState({ completed: 0, total: 0 });

  const cleanupAll = useCallback(
    async (events: readonly TeslaEvent[], outputRootPath?: string): Promise<CleanupRunResult> => {
      setIsCleaning(true);
      setEventStatuses(new Map());
      setCleaningEventId(undefined);
      setCleanupProgress({ completed: 0, total: events.length });

      const eventResults: CleanupEventResult[] = [];

      try {
        let completed = 0;
        for (const event of events) {
          setCleaningEventId(event.id);
          const result = await cleanupEventMergedDir(event, outputRootPath);

          eventResults.push(result);
          setEventStatuses((prev) => {
            const next = new Map(prev);
            next.set(event.id, result);
            return next;
          });

          completed += 1;
          setCleanupProgress({ completed, total: events.length });
        }

        return buildCleanupRunResult(eventResults);
      } finally {
        setIsCleaning(false);
        setCleaningEventId(undefined);
      }
    },
    [],
  );

  return { isCleaning, eventStatuses, cleaningEventId, cleanupProgress, cleanupAll };
}
