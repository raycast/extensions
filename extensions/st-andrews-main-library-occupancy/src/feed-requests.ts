const requestTimeout = 65_000;
const initialRetryDelay = 2_000;
const maxRetryDelay = 60_000;

export function startFeedRequests(interval: number, request: (signal: AbortSignal) => Promise<boolean>) {
  let active: AbortController | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = initialRetryDelay;
  let stopped = false;

  async function refresh() {
    if (stopped || active) return;
    clearTimeout(scheduled);

    const controller = new AbortController();
    active = controller;
    timeout = setTimeout(() => controller.abort(), requestTimeout);
    let complete = false;
    try {
      complete = (await request(controller.signal)) && !controller.signal.aborted;
    } catch {
      // Transport and validation failures leave the last visible values in place.
    } finally {
      clearTimeout(timeout);
      active = undefined;
    }

    if (stopped) return;
    scheduled = setTimeout(refresh, complete ? interval : retryDelay);
    retryDelay = complete ? initialRetryDelay : Math.min(retryDelay * 2, maxRetryDelay);
  }

  void refresh();
  return {
    refresh,
    stop() {
      stopped = true;
      clearTimeout(scheduled);
      clearTimeout(timeout);
      active?.abort();
    },
  };
}
