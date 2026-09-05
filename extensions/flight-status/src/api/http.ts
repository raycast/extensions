// Some providers (notably ADSB.lol) reject Node/undici's default fetch with a
// 403 unless a User-Agent is present. Send an identifying one on every request.
const USER_AGENT = "flight-status (Raycast extension)";

/**
 * Fetch JSON from a URL, returning `null` on any failure.
 *
 * Centralizes the fetch → check `response.ok` → parse-JSON sequence and, crucially,
 * wraps both the network call and JSON parsing in a try/catch. Callers get a
 * uniform "not available" signal (`null`) instead of a thrown rejection, which
 * keeps fallback chains (e.g. OpenSky → ADSB.lol) intact. A default `User-Agent`
 * is always sent (some APIs 403 without one), merged with any caller headers.
 *
 * @param url - Request URL
 * @param context - Short label used in error logs (e.g. "OpenSky")
 * @param init - Optional fetch init (e.g. headers for authenticated APIs)
 */
export async function fetchJson<T>(
  url: string,
  context: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, ...init?.headers },
    });

    if (!response.ok) {
      console.error(`${context} API error: ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    // Covers both the network request and JSON parsing (e.g. a captive-portal
    // HTML body that isn't valid JSON).
    console.error(`${context} request/parse error`, error);
    return null;
  }
}
