const requestTimeout = 65_000;
const initialRetryDelay = 2_000;
const maxRetryDelay = 60_000;

export type RefreshResult = { status: "success" } | { status: "failed"; message: string } | { status: "cancelled" };

export function startFeedRequests(interval: number, request: (signal: AbortSignal) => Promise<boolean>) {
  let active: { controller: AbortController; result: Promise<RefreshResult> } | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = initialRetryDelay;
  let stopped = false;

  async function run(controller: AbortController): Promise<RefreshResult> {
    let result: RefreshResult;
    try {
      // Defer the request until refresh has registered the active promise.
      await Promise.resolve();
      controller.signal.throwIfAborted();
      const complete = await request(controller.signal);
      result = complete ? { status: "success" } : { status: "failed", message: "Incomplete response" };
    } catch (error) {
      result = { status: "failed", message: error instanceof Error ? error.message : "Request failed" };
    } finally {
      clearTimeout(timeout);
      active = undefined;
    }

    if (stopped) return { status: "cancelled" };
    if (controller.signal.aborted) result = { status: "failed", message: "Request timed out" };
    const succeeded = result.status === "success";
    scheduled = setTimeout(refresh, succeeded ? interval : retryDelay);
    retryDelay = succeeded ? initialRetryDelay : Math.min(retryDelay * 2, maxRetryDelay);
    return result;
  }

  function refresh(): Promise<RefreshResult> {
    if (stopped) return Promise.resolve({ status: "cancelled" });
    if (active) return active.result;
    clearTimeout(scheduled);

    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), requestTimeout);
    const result = run(controller);
    active = { controller, result };
    return result;
  }

  void refresh();
  return {
    refresh,
    stop() {
      stopped = true;
      clearTimeout(scheduled);
      clearTimeout(timeout);
      active?.controller.abort();
    },
  };
}

export async function refreshFeeds(feeds: { label: string; refresh: () => Promise<RefreshResult> }[]) {
  const results = await Promise.all(feeds.map(async ({ label, refresh }) => ({ label, result: await refresh() })));
  return results.flatMap(({ label, result }) => (result.status === "failed" ? [`${label}: ${result.message}`] : []));
}

export interface Snapshot<T> {
  data: T;
  complete: boolean;
}

export async function loadFeedSnapshot<T>(
  url: string,
  signal: AbortSignal | undefined,
  read: (response: Response) => Promise<T>,
  previous: Snapshot<T> | undefined,
  merge?: (next: T, previous: T | undefined) => Snapshot<T>,
): Promise<{ snapshot?: Snapshot<T>; error?: Error }> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const next = await read(response);
    signal?.throwIfAborted();
    return { snapshot: merge ? merge(next, previous?.data) : { data: next, complete: true } };
  } catch (error) {
    return { snapshot: previous, error: error instanceof Error ? error : new Error("Request failed") };
  }
}
