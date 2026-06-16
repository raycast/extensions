// Keep in sync with the private fetchWithTimeout in desktop-secure/src/client.ts.
// Intentional difference: timeoutMs is required here (no default) to force callers
// to be explicit. The desktop-secure copy defaults to FETCH_TIMEOUT_MS.
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException(`Fetch timed out after ${timeoutMs} ms`, "TimeoutError")),
    timeoutMs,
  );
  // Forward an existing caller signal into our controller so both the timeout
  // and any external cancellation can abort the request.
  let forward: (() => void) | undefined;
  if (options.signal) {
    forward = () => controller.abort((options.signal as AbortSignal).reason);
    options.signal.addEventListener("abort", forward, { once: true });
    // If the signal was already aborted before we attached the listener,
    // addEventListener won't fire it — propagate the reason immediately.
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    }
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (options.signal && forward) {
      options.signal.removeEventListener("abort", forward);
    }
  }
}
