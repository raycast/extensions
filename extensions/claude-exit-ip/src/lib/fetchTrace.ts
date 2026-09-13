import { parseTrace, type TraceResult } from "./trace";

export const TRACE_URL = "https://claude.ai/cdn-cgi/trace";
const REQUEST_TIMEOUT_MS = 5000;

export async function fetchTrace(signal: AbortSignal): Promise<TraceResult> {
  try {
    const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
    const response = await fetch(TRACE_URL, { signal: requestSignal });
    return parseTrace(response.status, await response.text());
  } catch {
    return { kind: "unreachable" };
  }
}
