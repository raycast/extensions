export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAt?: number,
  ) {
    super(message);
  }
}
export type RateState = { remaining: number; resetAt: number };
export function rateState(headers: Headers): RateState | undefined {
  const remaining = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");
  if (
    remaining === null ||
    reset === null ||
    !Number.isFinite(Number(remaining)) ||
    !Number.isFinite(Number(reset))
  )
    return;
  return { remaining: Number(remaining), resetAt: Number(reset) * 1000 };
}
export async function requestJson<T>(
  origin: string,
  path: string,
  token: string,
  body?: unknown,
  fetcher: typeof fetch = fetch,
): Promise<{ data: T; rate?: RateState }> {
  // Refuse redirects so bearer credentials cannot follow an unexpected server URL.
  let response: Response;
  try {
    response = await fetcher(`${origin}${path}`, {
      method: body === undefined ? "GET" : "POST",
      redirect: "error",
      credentials: "omit",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      body === undefined
        ? "Could not reach ttrackii. Check your connection and refresh."
        : "The request could not be confirmed. Refresh Current Timer before trying again.",
      0,
    );
  }
  const payload = await response.json().catch(() => null);
  const rate = rateState(response.headers);
  if (!response.ok) {
    const retrySeconds = Number(response.headers.get("Retry-After"));
    const retryAt =
      rate?.resetAt ??
      Date.now() + (retrySeconds > 0 ? retrySeconds : 60) * 1000;
    throw new ApiError(
      response.status === 401
        ? "Your session expired. Sign in again."
        : response.status === 429
          ? "API limit reached. Try again after the quota resets."
          : payload?.error ||
            payload?.message ||
            `ttrackii returned HTTP ${response.status}`,
      response.status,
      response.status === 429 ? retryAt : undefined,
    );
  }
  if (payload === null)
    throw new ApiError(
      "The server returned an unreadable response. Refresh before trying again.",
      0,
    );
  return { data: payload as T, rate };
}
