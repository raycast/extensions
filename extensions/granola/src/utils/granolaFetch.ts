import { randomUUID } from "node:crypto";
import { diagnostic } from "./diagnostics";

export class GranolaRequestError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    public requestId: string,
    public retryAfterMs?: number,
  ) {
    super(`Granola ${endpoint}: HTTP ${status}. Reference: ${requestId}`);
    this.name = "GranolaRequestError";
  }
}

/** Shared transport. Never retries mutations or consumes/logs response bodies. */
export async function granolaFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const parsed = new URL(url);
  if (!["api.granola.ai", "stream.api.granola.ai"].includes(parsed.hostname) || parsed.protocol !== "https:")
    throw new Error("Unexpected Granola API address.");
  const endpoint = parsed.hostname + parsed.pathname;
  const requestId = randomUUID();
  const started = Date.now();
  const method = options.method ?? "GET";
  const timeout = AbortSignal.timeout(parsed.hostname === "stream.api.granola.ai" ? 180_000 : 60_000);
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
  } catch (error) {
    const code = options.signal?.aborted ? "cancelled" : timeout.aborted ? "timeout" : "network_error";
    diagnostic("request.failed", { endpoint, method, requestId, durationMs: Date.now() - started, code });
    if (options.signal?.aborted) throw error;
    throw new Error(
      `Granola ${code === "timeout" ? "request timed out" : "could not be reached"}. Reference: ${requestId}`,
    );
  }
  diagnostic(response.ok ? "request.ok" : "request.failed", {
    endpoint,
    method,
    requestId,
    status: response.status,
    durationMs: Date.now() - started,
    serverRequestId: response.headers.get("apigw-requestid") ?? response.headers.get("x-request-id") ?? undefined,
  });
  if (!response.ok) {
    const retry = response.headers.get("retry-after");
    const seconds = retry ? Number(retry) : NaN;
    const retryAfterMs = retry
      ? Number.isFinite(seconds)
        ? Math.max(0, seconds * 1000)
        : Math.max(0, Date.parse(retry) - Date.now())
      : undefined;
    try {
      await response.body?.cancel();
    } catch {
      /* Preserve the HTTP status if the body stream failed. */
    }
    throw new GranolaRequestError(
      response.status,
      parsed.pathname,
      requestId,
      Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
    );
  }
  return response;
}
