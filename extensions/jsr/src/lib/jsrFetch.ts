import { onErrorCapture } from "@/lib/errors";

/**
 * Fetch JSON from a JSR endpoint with consistent error capture.
 * Throws a descriptive Error on non-2xx; tools surface that to the AI caller.
 */
export const fetchJsrJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`JSR request failed: ${res.status} ${res.statusText} (${url})`);
    onErrorCapture(err);
    throw err;
  }
  return (await res.json()) as T;
};

/**
 * Fetch text from a JSR endpoint. Returns `null` on 404 (e.g. missing README).
 */
export const fetchJsrText = async (url: string): Promise<string | null> => {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = new Error(`JSR request failed: ${res.status} ${res.statusText} (${url})`);
    onErrorCapture(err);
    throw err;
  }
  return res.text();
};
