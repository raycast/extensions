import { MobbinError, getErrorMessage } from "./errors";
import { normalizeScreens } from "./normalize";
import { parseRetryAfterSeconds, withRateLimitRetry } from "./rate-limit";
import {
  MOBBIN_API_BASE_URL,
  type SearchClient,
  type SearchOptions,
  type Screen,
} from "./types";

export class MobbinRestClient implements SearchClient {
  constructor(private readonly apiKey: string) {}

  async searchScreens(
    options: SearchOptions,
    signal?: AbortSignal,
  ): Promise<Screen[]> {
    if (!this.apiKey.trim()) {
      throw new MobbinError(
        "Add a Mobbin API key in extension preferences.",
        "missing-api-key",
      );
    }

    return withRateLimitRetry(
      async () => this.searchScreensOnce(options, signal),
      signal,
    );
  }

  private async searchScreensOnce(
    options: SearchOptions,
    signal?: AbortSignal,
  ): Promise<Screen[]> {
    let response: Response;

    try {
      const init: RequestInit = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: options.query,
          platform: options.platform,
          mode: options.mode,
          limit: options.limit,
          image_quality: options.image_quality,
          exclude_screen_ids: options.exclude_screen_ids,
        }),
      };
      if (signal) init.signal = signal;

      response = await fetch(`${MOBBIN_API_BASE_URL}/v1/screens/search`, {
        ...init,
      });
    } catch (error) {
      throw new MobbinError(getErrorMessage(error), "network-error");
    }

    if (!response.ok) {
      throw await toMobbinHttpError(response);
    }

    const json = (await response.json()) as unknown;
    return normalizeScreens(json, options.platform, "api");
  }
}

async function toMobbinHttpError(response: Response): Promise<MobbinError> {
  const status = response.status;
  const message = await safeResponseMessage(response);

  if (status === 400)
    return new MobbinError(
      message || "Invalid Mobbin search parameters.",
      "bad-request",
      { status },
    );
  if (status === 401)
    return new MobbinError(
      "Missing or invalid Mobbin API key.",
      "invalid-api-key",
      { status },
    );
  if (status === 403)
    return new MobbinError(
      "Mobbin REST API requires a Team or Enterprise plan.",
      "plan-required",
      { status },
    );
  if (status === 404)
    return new MobbinError("Mobbin endpoint was not found.", "not-found", {
      status,
    });
  if (status === 429) {
    const retryAfterSeconds = parseRetryAfterSeconds(
      response.headers.get("Retry-After"),
    );
    return new MobbinError("Mobbin rate limit exceeded.", "rate-limited", {
      status,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    });
  }
  if (status >= 500)
    return new MobbinError("Mobbin returned a server error.", "server-error", {
      status,
    });
  return new MobbinError(
    message || `Mobbin request failed with status ${status}.`,
    "unknown",
    { status },
  );
}

async function safeResponseMessage(
  response: Response,
): Promise<string | undefined> {
  try {
    const text = await response.text();
    if (!text) return undefined;
    const parsed = JSON.parse(text) as {
      message?: unknown;
      error?: unknown;
      error_description?: unknown;
    };
    return [parsed.message, parsed.error_description, parsed.error].find(
      (value): value is string => typeof value === "string",
    );
  } catch {
    return undefined;
  }
}
