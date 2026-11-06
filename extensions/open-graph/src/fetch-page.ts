import fetch from "node-fetch";

export async function fetchPage(url: string, signal?: AbortSignal, timeoutMs = 15000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText || "Request failed"}`);
    const contentType = response.headers.get("content-type");
    if (contentType && !/\b(text\/html|application\/xhtml\+xml)\b/i.test(contentType)) {
      throw new Error("This URL did not return an HTML page.");
    }
    return { html: await response.text(), finalUrl: response.url };
  } catch (error) {
    if (timedOut) throw new Error(`The request timed out after ${timeoutMs / 1000} seconds. Try again.`);
    throw error;
  } finally {
    controller.abort();
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
