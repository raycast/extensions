import { useCachedState, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { isFresh, ModelUsage } from "../lib/cli";
import { listModelsUsedInThreads } from "../lib/delta";
import { showDeltaFailure } from "../lib/feedback";
import { sortThreadsNewestFirst } from "../lib/threads";
import { useThreads } from "./use-threads";

/** Only recent threads are scanned: each one is a large read, and they reflect current providers. */
const THREADS_TO_SCAN = 10;
/** Threads keep gaining answers, so even an unchanged set of threads is rescanned once a day. */
const SCAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface ModelScan {
  /** The scanned thread IDs, joined; a new thread changes it and triggers a rescan. */
  threadKey: string;
  scannedAt: number;
  models: ModelUsage[];
}

/**
 * Models used in the newest threads. A scan reads hundreds of megabytes through the CLI, so its
 * result is kept between launches and reused until a thread is added, a day passes, or `rescan`
 * is called. Leaving the screen stops a running scan.
 */
export function useUsedModels() {
  const { data: threads, isLoading: isLoadingThreads } = useThreads();
  const [scan, setScan] = useCachedState<ModelScan>("used-models-scan");
  const abortable = useRef<AbortController>(null);

  const threadIds = sortThreadsNewestFirst(threads ?? [])
    .slice(0, THREADS_TO_SCAN)
    .map((thread) => thread.id);
  const threadKey = threadIds.join(",");
  const isScanCurrent = scan?.threadKey === threadKey && isFresh(scan.scannedAt, SCAN_MAX_AGE_MS);

  const { isLoading: isScanning, revalidate } = usePromise(
    (key: string) => listModelsUsedInThreads(key ? key.split(",") : [], abortable.current?.signal),
    [threadKey],
    {
      execute: !!threads && !isScanCurrent,
      abortable,
      onData: (models) => setScan({ threadKey, scannedAt: Date.now(), models }),
      onError: (error) => showDeltaFailure(error, "Couldn't scan threads for models"),
    },
  );

  return { data: scan?.models, isLoading: (isLoadingThreads && !scan) || isScanning, rescan: revalidate };
}
