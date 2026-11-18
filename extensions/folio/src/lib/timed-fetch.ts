/** fetch with a deadline. Pure (no Raycast imports) so it can be tested against a real server. */

export class RequestTimeout extends Error {
  constructor(public readonly ms: number) {
    super(`SnapTrade didn't respond within ${ms / 1000} s`);
    this.name = "RequestTimeout";
  }
}

/**
 * One request whose headers and body must both arrive within `ms`. A stalled response becomes a
 * RequestTimeout instead of hanging (Node's own limits are about 5 minutes each for headers and body).
 */
export async function fetchText(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<{ status: number; headers: Headers; raw: string }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
    const raw = await res.text();
    return { status: res.status, headers: res.headers, raw };
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new RequestTimeout(ms);
    throw e;
  }
}
