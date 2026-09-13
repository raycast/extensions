import { isRequestTimeoutError } from "../../utils/request-timeout";

const DEFAULT_OPTIONAL_ENRICHMENT_TIMEOUT_MS = 6_000;
const OMITTED = Symbol("optional enrichment omitted");

/**
 * Run non-essential source enrichment without letting it consume the provider's
 * full request budget. External cancellation still propagates immediately;
 * expiry of the provider deadline omits enrichment so completed core data wins.
 */
export async function fetchOptionalEnrichment<T>(
  parentSignal: AbortSignal,
  request: (signal: AbortSignal) => Promise<T>,
  timeoutMs = DEFAULT_OPTIONAL_ENRICHMENT_TIMEOUT_MS,
): Promise<T | undefined> {
  if (parentSignal.aborted) {
    if (isRequestTimeoutError(parentSignal.reason)) return undefined;
    throw abortError(parentSignal.reason);
  }

  const controller = new AbortController();
  let onParentAbort: (() => void) | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const parentCancellation = new Promise<typeof OMITTED>((resolve, reject) => {
    onParentAbort = () => {
      const error = abortError(parentSignal.reason);
      controller.abort(error);
      if (isRequestTimeoutError(parentSignal.reason)) {
        resolve(OMITTED);
      } else {
        reject(error);
      }
    };
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
  });
  const localTimeout = new Promise<typeof OMITTED>((resolve) => {
    timeout = setTimeout(() => {
      controller.abort(new Error("Optional status history timed out"));
      resolve(OMITTED);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([request(controller.signal), parentCancellation, localTimeout]);
    if (parentSignal.aborted && !isRequestTimeoutError(parentSignal.reason)) throw abortError(parentSignal.reason);
    return result === OMITTED ? undefined : result;
  } catch {
    if (parentSignal.aborted) {
      if (isRequestTimeoutError(parentSignal.reason)) return undefined;
      throw abortError(parentSignal.reason);
    }
    return undefined;
  } finally {
    if (timeout) clearTimeout(timeout);
    if (onParentAbort) parentSignal.removeEventListener("abort", onParentAbort);
  }
}

function abortError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  return new Error(typeof reason === "string" && reason ? reason : "Status request aborted");
}
