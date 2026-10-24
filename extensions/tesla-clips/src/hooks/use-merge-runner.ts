/**
 * Runs ffmpeg merge jobs for one or many Tesla events with live progress state.
 *
 * @module hooks/use-merge-runner
 */

import { useCallback, useState } from "react";
import { mergeEvent } from "../lib/merger";
import { resolveEventOutputDir } from "../lib/paths";
import { buildSummaryMessage, buildTotals } from "../lib/results";
import type { EventMergeResult, MergeOptions, MergeRunResult, RootMergeResult, TeslaEvent } from "../types";

type EventStatusMap = Map<string, EventMergeResult>;

/** Return value of {@link useMergeRunner}. */
type UseMergeRunnerResult = {
  readonly isMerging: boolean;
  readonly eventStatuses: EventStatusMap;
  readonly mergingEventId: string | undefined;
  readonly mergeProgress: { readonly completed: number; readonly total: number };
  readonly mergeEvent: (event: TeslaEvent, options: MergeOptions) => Promise<EventMergeResult>;
  readonly mergeAll: (events: readonly TeslaEvent[], options: MergeOptions) => Promise<MergeRunResult>;
};

function resolveOutputDirectory(event: TeslaEvent, options: MergeOptions): string {
  return resolveEventOutputDir(event.eventDir, event.sourceRoot, options.outputRootPath);
}

/**
 * Exposes merge-in-progress UI state and `mergeEvent` / `mergeAll` executors.
 *
 * @returns Merge flags, per-event results map, progress, and merge functions.
 */
export function useMergeRunner(): UseMergeRunnerResult {
  const [isMerging, setIsMerging] = useState(false);
  const [eventStatuses, setEventStatuses] = useState<EventStatusMap>(new Map());
  const [mergingEventId, setMergingEventId] = useState<string | undefined>();
  const [mergeProgress, setMergeProgress] = useState({ completed: 0, total: 0 });

  const mergeSingleEvent = useCallback(async (event: TeslaEvent, options: MergeOptions): Promise<EventMergeResult> => {
    setIsMerging(true);
    setMergingEventId(event.id);

    try {
      const result = await mergeEvent(event, options);
      setEventStatuses((prev) => {
        const next = new Map(prev);
        next.set(event.id, result);
        return next;
      });
      return result;
    } finally {
      setIsMerging(false);
      setMergingEventId(undefined);
    }
  }, []);

  const mergeAll = useCallback(
    async (events: readonly TeslaEvent[], options: MergeOptions): Promise<MergeRunResult> => {
      setIsMerging(true);
      setMergeProgress({ completed: 0, total: events.length });

      const rootResultsMap = new Map<
        string,
        { eventResults: EventMergeResult[]; eventsScanned: number; outputBase: string }
      >();

      try {
        let completed = 0;
        for (const event of events) {
          setMergingEventId(event.id);
          const result = await mergeEvent(event, options);

          setEventStatuses((prev) => {
            const next = new Map(prev);
            next.set(event.id, result);
            return next;
          });

          completed += 1;
          setMergeProgress({ completed, total: events.length });

          const existing = rootResultsMap.get(event.sourceRoot);
          if (existing) {
            existing.eventResults.push(result);
          } else {
            rootResultsMap.set(event.sourceRoot, {
              eventResults: [result],
              eventsScanned: events.filter((e) => e.sourceRoot === event.sourceRoot).length,
              outputBase: resolveOutputDirectory(event, options),
            });
          }
        }

        const rootResults: RootMergeResult[] = [];
        for (const [sourceRoot, data] of rootResultsMap.entries()) {
          let merged = 0;
          let skippedSingle = 0;
          let skippedExisting = 0;
          let failed = 0;
          let cameraJobs = 0;

          for (const er of data.eventResults) {
            for (const output of er.outputs) {
              cameraJobs += 1;
              switch (output.status) {
                case "merged":
                  merged += 1;
                  break;
                case "skipped-single":
                  skippedSingle += 1;
                  break;
                case "skipped-existing":
                  skippedExisting += 1;
                  break;
                case "failed":
                  failed += 1;
                  break;
                default: {
                  const _exhaustive: never = output.status;
                  throw new Error(`Unhandled CameraMergeStatus: ${String(_exhaustive)}`);
                }
              }
            }
          }

          rootResults.push({
            sourceRoot,
            outputBase: data.outputBase,
            eventsScanned: data.eventsScanned,
            eventsWithClips: data.eventResults.length,
            cameraJobs,
            merged,
            skippedSingle,
            skippedExisting,
            failed,
            eventResults: data.eventResults,
          });
        }

        const totals = buildTotals(rootResults);
        const summaryMessage = buildSummaryMessage(totals);

        return { results: rootResults, totals, summaryMessage };
      } finally {
        setIsMerging(false);
        setMergingEventId(undefined);
      }
    },
    [],
  );

  return {
    isMerging,
    eventStatuses,
    mergingEventId,
    mergeProgress,
    mergeEvent: mergeSingleEvent,
    mergeAll,
  };
}
