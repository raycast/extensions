const BASE_URL = "https://api.morgen.so/v3";

export class MorgenError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MorgenError";
  }
}

export async function sendMorgenRequest<T>(
  path: string,
  apiKey: string,
  options: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  if (!apiKey) throw new MorgenError("Add a Morgen API key in extension preferences.", 401);
  const controller = new AbortController();
  const abort = () => controller.abort();
  options?.signal?.addEventListener("abort", abort, { once: true });
  if (options?.signal?.aborted) abort();
  const timer = setTimeout(abort, 15_000);
  try {
    const headers = new Headers(options?.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    headers.set("Authorization", `ApiKey ${apiKey}`);
    const response = await fetcher(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401)
        throw new MorgenError("Invalid Morgen API key. Check the extension preferences.", 401);
      if (response.status === 403)
        throw new MorgenError(
          "Your Morgen plan may not include API access, or the calendar connection needs attention.",
          403,
        );
      if (response.status === 429)
        throw new MorgenError(
          `Morgen rate limit reached. Retry after ${response.headers.get("Retry-After") ?? "a short wait"}.`,
          429,
        );
      throw new MorgenError(`Morgen request failed (${response.status}).`, response.status);
    }
    const body = response.status === 204 ? "" : await response.text();
    const value = body.trim() ? (JSON.parse(body) as T) : (undefined as T);
    return value;
  } catch (error) {
    if (error instanceof MorgenError) throw error;
    const reason = controller.signal.aborted
      ? "Morgen request was cancelled or timed out."
      : "Could not read the Morgen response.";
    throw new Error(`${reason} Check Morgen before retrying a change.`, {
      cause: error,
    });
  } finally {
    clearTimeout(timer);
    options?.signal?.removeEventListener("abort", abort);
  }
}
