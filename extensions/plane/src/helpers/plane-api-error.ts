/** Error for non-2xx Plane responses, from `planeRequest` / `planeRequestV2` and the SDK client's middleware. */
export class PlaneApiError extends Error {
  status: number;
  url: string;
  body?: unknown;
  /** v2 problem+json `code`, e.g. `rate_limited` or `invalid_request`. */
  code?: string;
  /** Seconds from `Retry-After`, on 429. */
  retryAfter?: number;

  constructor(
    status: number,
    message: string,
    url: string,
    body?: unknown,
    extra: { code?: string; retryAfter?: number } = {},
  ) {
    super(message);
    this.name = "PlaneApiError";
    this.status = status;
    this.url = url;
    this.body = body;
    this.code = extra.code;
    this.retryAfter = extra.retryAfter;
  }
}
