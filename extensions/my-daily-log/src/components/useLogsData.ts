import { usePromise } from "@raycast/utils";

/**
 * Loads data from the log files, showing a failure toast with the reason if something goes wrong
 * (e.g. an unreadable log folder or an invalid log file).
 */
export function useLogsData<T, A extends unknown[]>(load: (...args: A) => T, args: A) {
  return usePromise(async (...innerArgs: A) => load(...innerArgs), args, {
    failureToastOptions: { title: "Could not load your logs" },
  });
}
