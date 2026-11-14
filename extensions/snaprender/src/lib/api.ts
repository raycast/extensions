// SnapRender API client. Kept free of @raycast/api imports so it can be tested with plain Node.

export const API_BASE = "https://app.snap-render.com";
const USER_AGENT = "SnapRender-Raycast/1.0";
const REQUEST_TIMEOUT_MS = 120_000;

export type ImageFormat = "png" | "jpeg" | "webp" | "pdf";
export type Device = "iphone_14" | "iphone_15_pro" | "pixel_7" | "ipad_pro" | "macbook_pro";

export const FORMATS: ImageFormat[] = ["png", "jpeg", "webp", "pdf"];
export const DEVICES: Device[] = ["macbook_pro", "iphone_15_pro", "iphone_14", "pixel_7", "ipad_pro"];

export interface ScreenshotOptions {
  url: string;
  format?: ImageFormat;
  /** Omit or pass "desktop" for the default 1280 x 800 viewport. */
  device?: Device | "desktop";
  fullPage?: boolean;
  darkMode?: boolean;
}

export interface Screenshot {
  data: Buffer;
  format: ImageFormat;
  contentType: string;
  remainingCredits?: number;
}

export interface SignedUrl {
  signed_url: string;
  expires_at: string;
  expires_in: number;
}

export interface Extraction {
  url: string;
  type: string;
  content: string;
  wordCount?: number;
  processingTimeMs?: number;
}

export interface Usage {
  plan: string;
  period: { start: string; end: string };
  usage: {
    screenshots_used: number;
    screenshots_limit: number;
    screenshots_remaining: number;
    extra_credits?: number;
  };
}

/** An error from the SnapRender API body ({ error: { code, message, status } }) or from the network. */
export class SnapRenderError extends Error {
  readonly code: string;
  readonly status?: number;
  /** The message without the code prefix. */
  readonly detail: string;

  constructor(code: string, message: string, status?: number) {
    super(`${code}: ${message}`);
    this.name = "SnapRenderError";
    this.code = code;
    this.status = status;
    this.detail = message;
  }

  /** True when the API key is missing, wrong or revoked. */
  get isAuthError(): boolean {
    return this.status === 401 || this.code === "UNAUTHORIZED";
  }
}

type FetchFn = typeof fetch;

export interface ClientOptions {
  apiKey: string;
  fetch?: FetchFn;
  baseUrl?: string;
}

/** Makes sure the URL has a scheme and is http or https. Throws a SnapRenderError otherwise. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new SnapRenderError("MISSING_URL", "Enter a URL to capture.");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new SnapRenderError("INVALID_URL", `"${trimmed}" is not a valid URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SnapRenderError("INVALID_URL", "Only http and https pages can be captured.");
  }
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
    throw new SnapRenderError("INVALID_URL", `"${trimmed}" is not a valid URL.`);
  }
  return parsed.toString();
}

/** Form validator for URL fields: returns the message normalizeUrl would raise, or undefined when the URL is valid. */
export function urlValidationError(value: string | undefined): string | undefined {
  try {
    normalizeUrl(value ?? "");
    return undefined;
  } catch (error) {
    return error instanceof SnapRenderError ? error.detail : "Enter a valid URL";
  }
}

/** Builds the JSON body shared by /v1/screenshot and /v1/screenshot/sign. */
export function screenshotBody(options: ScreenshotOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    url: normalizeUrl(options.url),
    format: options.format ?? "png",
    full_page: options.fullPage ?? false,
    dark_mode: options.darkMode ?? false,
    block_ads: true,
    block_cookie_banners: true,
  };
  if (options.device && options.device !== "desktop") body.device = options.device;
  return body;
}

export function contentTypeFor(format: ImageFormat): string {
  return format === "pdf" ? "application/pdf" : `image/${format}`;
}

export function fileExtension(format: ImageFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

/** Turns a SnapRender error body into a SnapRenderError, falling back to the HTTP status text. */
export function parseErrorBody(status: number, statusText: string, text: string): SnapRenderError {
  try {
    const parsed = JSON.parse(text) as { error?: { code?: unknown; message?: unknown; status?: unknown } };
    const err = parsed?.error;
    if (err && typeof err.code === "string" && typeof err.message === "string") {
      return new SnapRenderError(err.code, err.message, typeof err.status === "number" ? err.status : status);
    }
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return new SnapRenderError(`HTTP_${status}`, statusText || "The SnapRender API returned an error.", status);
}

export class SnapRenderClient {
  private readonly apiKey: string;
  private readonly fetchFn: FetchFn;
  private readonly baseUrl: string;

  constructor(options: ClientOptions) {
    this.apiKey = options.apiKey.trim();
    this.fetchFn = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? API_BASE;
  }

  private async request(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<Response> {
    if (!this.apiKey) {
      throw new SnapRenderError("UNAUTHORIZED", "Add your SnapRender API key in the extension preferences.", 401);
    }
    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "User-Agent": USER_AGENT,
      Accept: "*/*",
    };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: init.method,
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const name = (error as Error)?.name;
      if (name === "TimeoutError" || name === "AbortError") {
        throw new SnapRenderError("TIMEOUT", "SnapRender did not answer in time. Try again.");
      }
      throw new SnapRenderError("NETWORK_ERROR", "Could not reach SnapRender. Check your internet connection.");
    }

    if (!response.ok) {
      throw parseErrorBody(response.status, response.statusText, await response.text());
    }
    return response;
  }

  async screenshot(options: ScreenshotOptions): Promise<Screenshot> {
    const body = screenshotBody(options);
    const response = await this.request("/v1/screenshot", { method: "POST", body });
    const data = Buffer.from(await response.arrayBuffer());
    const format = body.format as ImageFormat;
    const remaining = Number(response.headers.get("x-remaining-credits"));
    return {
      data,
      format,
      contentType: response.headers.get("content-type") ?? contentTypeFor(format),
      remainingCredits:
        Number.isFinite(remaining) && response.headers.has("x-remaining-credits") ? remaining : undefined,
    };
  }

  /** Signing is free. Each render of the signed URL uses one capture. */
  async signUrl(options: ScreenshotOptions, expiresIn = 86_400): Promise<SignedUrl> {
    const body = { ...screenshotBody(options), expires_in: expiresIn };
    const response = await this.request("/v1/screenshot/sign", { method: "POST", body });
    return (await response.json()) as SignedUrl;
  }

  async extractMarkdown(url: string, maxLength?: number): Promise<Extraction> {
    const body: Record<string, unknown> = { url: normalizeUrl(url), type: "markdown" };
    if (maxLength) body.max_length = maxLength;
    const response = await this.request("/v1/extract", { method: "POST", body });
    const result = (await response.json()) as Extraction;
    if (typeof result.content !== "string") result.content = "";
    return result;
  }

  async usage(): Promise<Usage> {
    const response = await this.request("/v1/usage", { method: "GET" });
    return (await response.json()) as Usage;
  }
}
