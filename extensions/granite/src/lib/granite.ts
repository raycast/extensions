// Thin HTTP client for the Granite Agent API (https://api.granite.co/v1).
// Ported near-verbatim from the MCP shim (mcp/src/client.ts): attaches the
// bearer header and translates the API's documented error codes into messages
// a person can act on. No re-sanitization happens here — the API already runs
// every document-derived string through its server-side output sanitizer.
//
// Deliberately free of any @raycast/api import so it stays unit-testable under
// `node --test` with a stubbed fetch. The Raycast glue (reading the token from
// preferences) lives in preferences.ts.

const DEFAULT_BASE = "https://api.granite.co/v1";

export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface GraniteClientOptions {
  baseUrl?: string;
  token?: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

type Query = Record<string, string | number | boolean | undefined>;

export class GraniteClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: GraniteClientOptions = {}) {
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
    this.token = opts.token ?? "";
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async request<T = unknown>(method: "GET" | "POST", path: string, opts: { query?: Query } = {}): Promise<T> {
    if (!this.token) {
      throw new ApiError("Missing API token — set it in the Granite extension preferences (a gra_live_… token).");
    }

    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), {
        method,
        headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new ApiError(
        `Could not reach the Granite API at ${this.baseUrl} — check the API base URL preference and your network connection. (${detail})`,
      );
    }

    if (!res.ok) {
      throw mapError(res, await safeJson(res));
    }
    return (await safeJson(res)) as T;
  }
}

interface ErrorBody {
  error?: string;
  feature?: string;
  required?: string;
  message?: string;
}

// Map the API's documented error contract (docs/ops/api.md) to messages a
// person can act on, rather than a bare status code.
function mapError(res: Response, raw: unknown): ApiError {
  const body = (raw ?? {}) as ErrorBody;
  const code = body.error;
  switch (res.status) {
    case 401:
      return new ApiError("Invalid or expired token — check the API token in the Granite extension preferences.", 401);
    case 402:
      return new ApiError(
        `This needs a paid Granite plan${body.feature ? ` (feature: ${body.feature})` : ""}. Upgrade at granite.co/settings/billing.`,
        402,
      );
    case 403:
      return new ApiError(
        `Your token is missing the \`${body.required ?? "required"}\` scope. Mint a new token with it at Granite → Settings → Developer → Access tokens.`,
        403,
      );
    case 404:
      return new ApiError("No such document in your vault (or it isn't accessible to this token).", 404);
    case 422:
      // Prefer the API's human message when present (e.g. unknown_vault lists
      // the valid slugs) so the caller can self-correct.
      return new ApiError(body.message ?? `Invalid request${code ? `: ${code}` : ""}.`, 422);
    case 429: {
      const retry = res.headers.get("retry-after");
      return new ApiError(`Rate limited — retry after ${retry ?? "a few"} seconds.`, 429);
    }
    default:
      return new ApiError(`Granite API error (HTTP ${res.status})${code ? `: ${code}` : ""}.`, res.status);
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
