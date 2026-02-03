import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import type { GrepEntry } from "../types";
import { parseGrepLine, resetEntryPool } from "../utils";

type GrepOptions = {
  execute: boolean;
  maxResults: number;
  timeout: number;
  pageSize?: number;
  onStart?: (cancel: () => void) => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onTimeout?: () => void;
};

type UseGrepResult = {
  data: GrepEntry[];
  isLoading: boolean;
  pagination: {
    pageSize: number;
    hasMore: boolean;
    onLoadMore: () => void;
  };
};

/**
 * Interval in ms between UI updates during streaming.
 * Batches multiple results into single React updates for better performance.
 */
const UI_UPDATE_INTERVAL = 300;

/**
 * Maximum number of results the hook will ever return.
 * Prevents memory issues and UI slowdowns with very large result sets.
 */
const HARD_MAX_RESULTS = 500;

/** Maximum buffer size before discarding to prevent memory issues with malformed input. */
const MAX_BUFFER_SIZE = 100_000;

/**
 * React hook for executing grep commands with streaming results using Web Streams API.
 *
 * Uses a pull-based Web Streams approach (ReadableStream) for memory-efficient processing
 * of grep output. Data is read on-demand rather than buffered entirely in memory,
 * enabling handling of large result sets without blocking the event loop.
 */
export const useGrep = (command: string, options: GrepOptions): UseGrepResult => {
  const {
    execute,
    maxResults,
    timeout,
    pageSize = 20,
    onStart,
    onLoad,
    onError,
    onTimeout,
  } = options;

  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const searchIdRef = useRef(0);
  const resultsRef = useRef<GrepEntry[]>([]);

  useEffect(() => {
    const currentSearchId = ++searchIdRef.current;
    const maxEntriesLimit = Math.min(maxResults, HARD_MAX_RESULTS);

    resetEntryPool();
    resultsRef.current = [];
    setCurrentPage(0);
    setUpdateTrigger(0);

    if (!execute) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const abortController = new AbortController();
    let entryId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let updateIntervalId: ReturnType<typeof setInterval> | undefined;
    let previousResultCount = 0;

    const cancel = () => {
      abortController.abort();
    };

    onStart?.(cancel);

    const childProcess = spawn("sh", ["-c", command], {
      stdio: ["ignore", "pipe", "ignore"],
    });

    const cleanup = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      if (updateIntervalId !== undefined) {
        clearInterval(updateIntervalId);
        updateIntervalId = undefined;
      }
      if (!childProcess.killed && childProcess.exitCode === null) {
        childProcess.kill("SIGKILL");
      }
    };

    // Timeout handler
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        if (searchIdRef.current !== currentSearchId) return;
        cleanup();
        setIsLoading(false);
        startTransition(() => setUpdateTrigger((n) => n + 1));
        onTimeout?.();
      }, timeout);
    }

    updateIntervalId = setInterval(() => {
      if (searchIdRef.current !== currentSearchId) return;
      if (resultsRef.current.length > previousResultCount) {
        previousResultCount = resultsRef.current.length;
        startTransition(() => setUpdateTrigger((n) => n + 1));
      }
    }, UI_UPDATE_INTERVAL);

    const processGrepStream = async () => {
      let reader: ReadableStreamDefaultReader<string> | null = null;

      try {
        reader = Readable.toWeb(childProcess.stdout!)
          .pipeThrough(new TextDecoderStream())
          .getReader();

        let buffer = "";
        const results = resultsRef.current;

        while (results.length < maxEntriesLimit) {
          if (abortController.signal.aborted) break;

          const { value, done } = await reader.read();

          if (done) break;

          buffer += value;

          if (buffer.length > MAX_BUFFER_SIZE) {
            buffer = "";
            continue;
          }

          let start = 0;
          let newlinePos: number;

          while ((newlinePos = buffer.indexOf("\n", start)) !== -1) {
            if (results.length >= maxEntriesLimit) break;

            const lineLength = newlinePos - start;
            if (lineLength >= 5) {
              const line = buffer.slice(start, newlinePos);
              const entry = parseGrepLine(line, entryId++);
              if (entry) {
                results.push(entry);
              }
            }
            start = newlinePos + 1;
          }

          buffer = start > 0 ? buffer.slice(start) : buffer;

          if (results.length >= maxEntriesLimit) {
            break;
          }
        }

        if (buffer && buffer.length >= 5 && results.length < maxEntriesLimit) {
          const entry = parseGrepLine(buffer, entryId++);
          if (entry) results.push(entry);
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        onError?.(err as Error);
      } finally {
        try {
          await reader?.cancel();
        } catch {
          /* ignore */
        }

        cleanup();

        if (searchIdRef.current === currentSearchId) {
          setIsLoading(false);
          startTransition(() => setUpdateTrigger((n) => n + 1));
          onLoad?.();
        }
      }
    };

    childProcess.once("error", (err) => {
      if (searchIdRef.current !== currentSearchId) return;
      cleanup();
      setIsLoading(false);
      onError?.(err);
    });

    processGrepStream();

    return () => {
      abortController.abort();
      cleanup();
    };
  }, [command, execute, maxResults, timeout, pageSize]);

  void updateTrigger;
  const results = resultsRef.current;
  const visibleCount = Math.min((currentPage + 1) * pageSize, results.length);
  const hasMore = results.length > visibleCount;

  const paginatedEntries =
    results.length <= visibleCount ? results : results.slice(0, visibleCount);

  const handleLoadMore = useCallback(() => {
    startTransition(() => {
      setCurrentPage((prev) => prev + 1);
    });
  }, []);

  return {
    data: paginatedEntries,
    isLoading,
    pagination: {
      pageSize,
      hasMore,
      onLoadMore: handleLoadMore,
    },
  };
};
