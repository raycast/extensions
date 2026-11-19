import { parseTrace, type TraceResult } from "./trace";

export const TRACE_URL = "https://claude.ai/cdn-cgi/trace";
const REQUEST_TIMEOUT_MS = 5000;

export async function fetchTrace(signal: AbortSignal): Promise<TraceResult> {
  let response: Response;
  let body: string;
  try {
    const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
    response = await fetch(TRACE_URL, { signal: requestSignal });
    body = await response.text();
  } catch {
    return { kind: "unreachable" };
  }
  // Outside the try: a parse bug must surface, not pose as "unreachable".
  return parseTrace(response.status, body);
}
