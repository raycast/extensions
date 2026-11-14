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
  options: { method?: "GET" | "POST"; body?: unknown } = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `ApiKey ${apiKey}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Could not reach Morgen or the request timed out. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    if (response.status === 401) throw new MorgenError("Invalid Morgen API key. Check the extension preferences.", 401);
    if (response.status === 403)
      throw new MorgenError(
        "Your Morgen plan may not include API access, or the calendar connection needs attention.",
        403,
      );
    if (response.status === 429) {
      throw new MorgenError(
        `Morgen rate limit reached. Try again in ${response.headers.get("Retry-After") ?? "a few"} seconds.`,
        429,
      );
    }
    throw new MorgenError(body.message || `Morgen request failed (${response.status}).`, response.status);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
