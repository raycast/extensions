import { useState, useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  MeasurementStatus,
  MeasurementType,
  createMeasurement,
  getGlobalpingErrorDisplay,
  getMeasurement,
  getProbeResultBaseKey,
  getProbeResultKeys,
  getProbeResultKey,
  getProbeResultStableId,
  type Measurement,
  type MeasurementPayload,
  type ProbeResult,
} from "../api/globalping";
import { incrementLocationStat } from "../utils/storage";

/**
 * Detects abort-like errors from fetch and AbortController flows.
 */
function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || e.message === "The operation was aborted.");
}

/**
 * Treats per-request polling timeouts as transient so the next poll can retry.
 */
function isRetriablePollingError(e: unknown): boolean {
  return e instanceof Error && (isAbortError(e) || e.name === "TimeoutError");
}

/**
 * Reuses previously assigned duplicate suffixes when probe results have no stable server id.
 */
function resolveProbeResultKeys(previous: Measurement | null, nextResults: ProbeResult[]): string[] {
  const previousResults = previous?.results ?? [];
  const previousKeys = previous?.resultKeys ?? getProbeResultKeys(previousResults);
  const reusableKeysByBaseKey = new Map<string, string[]>();
  const usedOccurrenceIndexesByBaseKey = new Map<string, Set<number>>();

  for (const [index, result] of previousResults.entries()) {
    if (getProbeResultStableId(result.probe)) {
      continue;
    }

    const key = previousKeys[index];
    if (!key) {
      continue;
    }

    const baseKey = getProbeResultBaseKey(result.probe);
    const reusableKeys = reusableKeysByBaseKey.get(baseKey) ?? [];
    reusableKeys.push(key);
    reusableKeysByBaseKey.set(baseKey, reusableKeys);

    const usedIndexes = usedOccurrenceIndexesByBaseKey.get(baseKey) ?? new Set<number>();
    usedIndexes.add(getProbeResultOccurrenceIndex(key, baseKey));
    usedOccurrenceIndexesByBaseKey.set(baseKey, usedIndexes);
  }

  return nextResults.map((result) => {
    const stableId = getProbeResultStableId(result.probe);
    if (stableId) {
      return getProbeResultKey(result.probe, stableId);
    }

    const baseKey = getProbeResultBaseKey(result.probe);
    const reusableKeys = reusableKeysByBaseKey.get(baseKey);
    const reusedKey = reusableKeys?.shift();
    if (reusedKey) {
      return reusedKey;
    }

    const usedIndexes = usedOccurrenceIndexesByBaseKey.get(baseKey) ?? new Set<number>();
    let occurrenceIndex = 0;
    while (usedIndexes.has(occurrenceIndex)) {
      occurrenceIndex += 1;
    }
    usedIndexes.add(occurrenceIndex);
    usedOccurrenceIndexesByBaseKey.set(baseKey, usedIndexes);
    return getProbeResultKey(result.probe, occurrenceIndex);
  });
}

function getProbeResultOccurrenceIndex(key: string, baseKey: string): number {
  if (key === baseKey) {
    return 0;
  }

  const prefix = `${baseKey}#`;
  if (!key.startsWith(prefix)) {
    return 0;
  }

  const suffix = key.slice(prefix.length);
  const occurrenceIndex = Number.parseInt(suffix, 10);
  return Number.isInteger(occurrenceIndex) && String(occurrenceIndex) === suffix ? occurrenceIndex : 0;
}

/**
 * Starts measurements, polls Globalping for updates, and merges incremental probe results.
 */
export function useMeasurement(authToken: string) {
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [measurementId, setMeasurementId] = useState<string | null>(null);
  const [probeLimit, setProbeLimit] = useState(0);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);
  const toastRef = useRef<Awaited<ReturnType<typeof showToast>> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const createAbortControllerRef = useRef<AbortController | null>(null);
  const runTokenRef = useRef(0);

  /**
   * Computes a polling timeout based on command type and requested probe count.
   */
  function getPollingTimeoutMs(type: Measurement["type"] | null, limit: number): number {
    const isLongRunningMeasurement = type === MeasurementType.MTR || type === MeasurementType.TRACEROUTE;
    const baseTimeoutMs = isLongRunningMeasurement ? 45_000 : 30_000;
    const perProbeTimeoutMs = (isLongRunningMeasurement ? 1_200 : 700) * Math.max(limit, 1);
    return Math.max(baseTimeoutMs, perProbeTimeoutMs);
  }

  /**
   * Cancels any in-flight polling work and marks the measurement as no longer running.
   */
  function stopPolling() {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isFetchingRef.current = false;
    setIsRunning(false);
  }

  /**
   * Cancels the in-flight measurement creation request, if any.
   */
  function stopCreateRequest() {
    createAbortControllerRef.current?.abort();
    createAbortControllerRef.current = null;
  }

  /**
   * Merges a new measurement payload with the previous one while preserving streamed probe results.
   */
  function mergeMeasurementResults(previous: Measurement | null, next: Measurement): Measurement {
    if (!previous || previous.id !== next.id) {
      return { ...next, resultKeys: getProbeResultKeys(next.results) };
    }

    const previousKeys = previous.resultKeys ?? getProbeResultKeys(previous.results);
    const nextKeys = resolveProbeResultKeys(previous, next.results);
    const mergedByKey = new Map(previous.results.map((result, index) => [previousKeys[index], result]));

    for (const [index, result] of next.results.entries()) {
      mergedByKey.set(nextKeys[index], result);
    }

    const nextOrder = new Set(nextKeys);
    const carryForwardEntries =
      next.status === MeasurementStatus.IN_PROGRESS
        ? previous.results
            .map((result, index) => ({ key: previousKeys[index], result }))
            .filter(({ key }) => !nextOrder.has(key))
        : previous.results
            .map((result, index) => ({ key: previousKeys[index], result }))
            .filter(({ key, result }) => {
              return !nextOrder.has(key) && result.result.status !== "in-progress";
            });
    const mergedResults = [...next.results, ...carryForwardEntries.map(({ result }) => result)];
    const mergedResultsKeys = [...nextKeys, ...carryForwardEntries.map(({ key }) => key)];

    return {
      ...next,
      resultKeys: mergedResultsKeys,
      results: mergedResults.map((result, index) => mergedByKey.get(mergedResultsKeys[index]) ?? result),
    };
  }

  // Polling

  useEffect(() => {
    if (!measurementId) return;

    const activeMeasurementId = measurementId;
    const activeRunToken = runTokenRef.current;
    const startedAt = Date.now();
    const TIMEOUT_MS = getPollingTimeoutMs(measurement?.type ?? null, probeLimit);
    const POLL_INTERVAL_MS = 600;
    const REQUEST_TIMEOUT_MS = 12_000;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let isDisposed = false;

    function scheduleNextPoll() {
      if (isDisposed || controller.signal.aborted) {
        return;
      }

      pollingRef.current = setTimeout(() => {
        void pollMeasurement();
      }, POLL_INTERVAL_MS);
    }

    async function pollMeasurement() {
      if (isFetchingRef.current) return;
      if (controller.signal.aborted) return;
      if (Date.now() - startedAt > TIMEOUT_MS) {
        stopPolling();
        await showToast({
          style: Toast.Style.Failure,
          title: "Timed out",
          message: `No response after ${Math.round(TIMEOUT_MS / 1000)}s.`,
        });
        return;
      }

      isFetchingRef.current = true;
      try {
        const requestSignal = AbortSignal.any([controller.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
        const result = await getMeasurement(authToken, activeMeasurementId, requestSignal);
        if (controller.signal.aborted || activeRunToken !== runTokenRef.current) {
          return;
        }
        setMeasurement((previous) => mergeMeasurementResults(previous, result));
        if (result.status !== MeasurementStatus.IN_PROGRESS) {
          stopPolling();
          if (toastRef.current && activeRunToken === runTokenRef.current) {
            toastRef.current.style = Toast.Style.Success;
            toastRef.current.title = "Done";
          }
          return;
        }
      } catch (e) {
        if (isRetriablePollingError(e)) {
          isFetchingRef.current = false;
          return;
        }
        if (activeRunToken !== runTokenRef.current) {
          isFetchingRef.current = false;
          return;
        }
        stopPolling();
        const { title, message } = getGlobalpingErrorDisplay(e, "Polling failed");
        await showToast({ style: Toast.Style.Failure, title, message });
      } finally {
        isFetchingRef.current = false;
        if (!controller.signal.aborted && activeRunToken === runTokenRef.current) {
          scheduleNextPoll();
        }
      }
    }

    void pollMeasurement();

    return () => {
      isDisposed = true;
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      controller.abort();
      abortControllerRef.current = null;
      isFetchingRef.current = false;
    };
  }, [authToken, measurementId, measurement?.type, probeLimit]);

  // Run test

  async function runTest(payload: MeasurementPayload, toastTitle: string) {
    runTokenRef.current += 1;
    const activeRunToken = runTokenRef.current;
    stopPolling();
    stopCreateRequest();

    setIsRunning(true);
    setMeasurement(null);
    setMeasurementId(null);
    setProbeLimit(payload.limit ?? 1);

    toastRef.current = await showToast({ style: Toast.Style.Animated, title: toastTitle });
    if (activeRunToken !== runTokenRef.current) {
      return;
    }

    let controller: AbortController | null = null;

    try {
      controller = new AbortController();
      createAbortControllerRef.current = controller;
      const requestSignal = AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]);
      const id = await createMeasurement(authToken, payload, requestSignal);
      if (activeRunToken !== runTokenRef.current) {
        return;
      }
      if (createAbortControllerRef.current === controller) {
        createAbortControllerRef.current = null;
      }
      setMeasurement({
        id,
        type: payload.type,
        status: MeasurementStatus.IN_PROGRESS,
        target: payload.target,
        results: [],
        resultKeys: [],
      });
      setMeasurementId(id);
      const firstLocation = Array.isArray(payload.locations) ? payload.locations[0] : undefined;
      if (firstLocation && typeof firstLocation !== "string" && firstLocation.magic) {
        void incrementLocationStat(firstLocation.magic);
      }
    } catch (e) {
      if (createAbortControllerRef.current === controller) {
        createAbortControllerRef.current = null;
      }
      if (activeRunToken !== runTokenRef.current) {
        return;
      }
      setIsRunning(false);
      if (isAbortError(e)) {
        return;
      }
      if (toastRef.current) {
        const { title, message } = getGlobalpingErrorDisplay(e, "Failed to start test");
        toastRef.current.style = Toast.Style.Failure;
        toastRef.current.title = title;
        toastRef.current.message = message;
      }
      return;
    }
  }

  return { measurement, isRunning, runTest, probeLimit };
}
