import {
  MobbinError,
  abortError,
  getErrorMessage,
  isAbortError,
  validateSearchQuery,
} from "./errors";
import { normalizeScreens } from "./normalize";
import { parseRetryAfterSeconds, withRateLimitRetry } from "./rate-limit";
import { createTimeoutSignal } from "./request";
import {
  MOBBIN_API_BASE_URL,
  type MobbinReference,
  type SearchCapabilities,
  type SearchClient,
  type SearchOptions,
} from "./types";

const SEARCH_TIMEOUT_MS = 60_000;

export class MobbinRestClient implements SearchClient {
  constructor(private readonly apiKey: string) {}

  async connect(): Promise<void> {
    if (!this.apiKey.trim()) {
      throw new MobbinError(
        "Add a Mobbin API key in extension preferences.",
        "missing-api-key",
      );
    }
  }

  async getCapabilities(): Promise<SearchCapabilities> {
    await this.connect();
    return { screen: true, flow: false, section: false };
  }

  async search(
    options: SearchOptions,
    signal?: AbortSignal,
  ): Promise<MobbinReference[]> {
    await this.connect();
    if (options.kind !== "screen") {
      throw new MobbinError(
        "Mobbin flows and sections require OAuth MCP mode.",
        "unsupported-kind",
      );
    }

    const query = validateSearchQuery(options.query);
    if (options.limit < 1 || options.limit > 100) {
      throw new MobbinError(
        "Mobbin result limits must be between 1 and 100.",
        "bad-request",
      );
    }
    if (options.excludeScreenIds.length > 100) {
      throw new MobbinError(
        "Mobbin accepts at most 100 excluded screen IDs.",
        "bad-request",
      );
    }

    const timeout = createTimeoutSignal(SEARCH_TIMEOUT_MS, signal);
    try {
      return await withRateLimitRetry(
        () => this.searchOnce({ ...options, query }, timeout.signal),
        timeout.signal,
      );
    } catch (error) {
      if (signal?.aborted) throw abortError(signal.reason);
      if (isAbortError(error)) throw error;
      if (
        timeout.signal.aborted &&
        timeout.signal.reason instanceof Error &&
        timeout.signal.reason.name === "TimeoutError"
      ) {
        throw new MobbinError("Mobbin search timed out.", "timeout");
      }
      throw error;
    } finally {
      timeout.dispose();
    }
  }

  async dispose(): Promise<void> {
    // REST does not keep a connection open.
  }

  private async searchOnce(
    options: SearchOptions,
    signal: AbortSignal,
  ): Promise<MobbinReference[]> {
    let response: Response;
    try {
      response = await fetch(`${MOBBIN_API_BASE_URL}/v1/screens/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: options.query,
          platform: options.platform,
          mode: options.mode,
          limit: options.limit,
          image_quality: options.imageQuality,
          exclude_screen_ids: options.excludeScreenIds,
        }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw abortError(signal.reason);
      if (isAbortError(error)) throw error;
      throw new MobbinError(getErrorMessage(error), "network-error");
    }

    if (!response.ok) throw await toMobbinHttpError(response);

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new MobbinError(
        "Mobbin returned an invalid JSON response.",
        "contract-mismatch",
      );
    }

    if (
      !json ||
      typeof json !== "object" ||
      !Array.isArray((json as { screens?: unknown }).screens)
    ) {
      throw new MobbinError(
        "Mobbin returned an unexpected screen-search response.",
        "contract-mismatch",
        {
          safeKeys:
            json && typeof json === "object"
              ? Object.keys(json).slice(0, 20)
              : [],
        },
      );
    }

    const candidates = (json as { screens: unknown[] }).screens;
    const screens = normalizeScreens(json, options.platform, "api");
    if (candidates.length > 0 && screens.length === 0) {
      throw new MobbinError(
        "Mobbin returned screens in an unsupported format.",
        "contract-mismatch",
        {
          safeKeys:
            candidates[0] && typeof candidates[0] === "object"
              ? Object.keys(candidates[0]).slice(0, 20)
              : [],
        },
      );
    }
    return screens;
  }
}

async function toMobbinHttpError(response: Response): Promise<MobbinError> {
  const status = response.status;
  const { message, serverCode } = await safeResponseError(response);
  const details = {
    status,
    ...(serverCode ? { serverCode } : {}),
  };

  if (status === 400)
    return new MobbinError(
      message || "Invalid Mobbin search parameters.",
      "bad-request",
      details,
    );
  if (status === 401)
    return new MobbinError(
      message || "Missing or invalid Mobbin API key.",
      "invalid-api-key",
      details,
    );
  if (status === 403)
    return new MobbinError(
      message || "Mobbin REST API requires a Team or Enterprise plan.",
      "plan-required",
      details,
    );
  if (status === 404)
    return new MobbinError(
      message || "Mobbin endpoint was not found.",
      "not-found",
      details,
    );
  if (status === 429) {
    const retryAfterSeconds = parseRetryAfterSeconds(
      response.headers.get("Retry-After"),
    );
    return new MobbinError(
      message || "Mobbin rate limit exceeded.",
      "rate-limited",
      {
        ...details,
        ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
      },
    );
  }
  if (status >= 500)
    return new MobbinError(
      message || "Mobbin returned a server error.",
      "server-error",
      details,
    );
  return new MobbinError(
    message || `Mobbin request failed with status ${status}.`,
    "unknown",
    details,
  );
}

async function safeResponseError(
  response: Response,
): Promise<{ message?: string; serverCode?: string }> {
  try {
    const text = await response.text();
    if (!text) return {};
    const parsed = JSON.parse(text) as {
      message?: unknown;
      error?: unknown;
      error_description?: unknown;
    };
    if (typeof parsed.message === "string") return { message: parsed.message };
    if (typeof parsed.error_description === "string")
      return { message: parsed.error_description };
    if (typeof parsed.error === "string") return { message: parsed.error };
    if (parsed.error && typeof parsed.error === "object") {
      const nested = parsed.error as {
        code?: unknown;
        message?: unknown;
      };
      return {
        ...(typeof nested.message === "string"
          ? { message: nested.message }
          : {}),
        ...(typeof nested.code === "string" ? { serverCode: nested.code } : {}),
      };
    }
    return {};
  } catch {
    return {};
  }
}
