export type LanguageCode = "en" | "fr" | "la" | "pt" | "es";
export type OutputType = "words" | "sentences" | "paragraphs";
export type ThemeCode =
  | "business"
  | "ecology"
  | "law"
  | "medicine"
  | "mining"
  | "politics"
  | "technology";

export interface GenerateOptions {
  lang: LanguageCode;
  type: OutputType;
  theme: ThemeCode;
  count: number;
  grammar_correct: boolean;
  orthography_correct: boolean;
}

export interface GenerateResponse {
  lang: LanguageCode;
  type: OutputType;
  theme: ThemeCode;
  count: number;
  grammar_correct: boolean;
  orthography_correct: boolean;
  results: string[];
}

export const DEFAULT_API_URL = "https://prolixo.vercel.app";
export const REQUEST_TIMEOUT_MS = 15_000;

export const LANGUAGES: ReadonlyArray<{ code: LanguageCode; name: string }> = [
  { code: "pt", name: "Portuguese" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "la", name: "Latin (Lorem Ipsum)" },
];

export const OUTPUT_TYPES: ReadonlyArray<{ code: OutputType; name: string }> = [
  { code: "paragraphs", name: "Paragraphs" },
  { code: "sentences", name: "Sentences" },
  { code: "words", name: "Words" },
];

export const THEMES: ReadonlyArray<{ code: ThemeCode; name: string }> = [
  { code: "business", name: "Business" },
  { code: "ecology", name: "Ecology" },
  { code: "law", name: "Law" },
  { code: "medicine", name: "Medicine" },
  { code: "mining", name: "Mining" },
  { code: "politics", name: "Politics" },
  { code: "technology", name: "Technology" },
];

export class ProlixoApiError extends Error {
  status: number;
  retryAfter?: number;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = "ProlixoApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export function parseCountArg(raw: string | undefined, fallback: number): number {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return fallback;
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Count must be an integer between 1 and 100.");
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < 1 || parsed > 100) {
    throw new Error("Count must be an integer between 1 and 100.");
  }
  return parsed;
}

export function normalizeBaseUrl(url?: string): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) {
    return DEFAULT_API_URL;
  }
  const cleaned = trimmed.replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("Invalid API Base URL. Expected an http:// or https:// URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid API Base URL protocol. Must be http:// or https://.");
  }
  return cleaned;
}

export function buildGeneratePayload(options: GenerateOptions): GenerateOptions {
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 100) {
    throw new Error("Count must be an integer between 1 and 100.");
  }

  if (options.lang === "la") {
    return {
      lang: "la",
      type: options.type,
      theme: "business",
      count: options.count,
      grammar_correct: true,
      orthography_correct: true,
    };
  }

  return { ...options };
}

export function formatResults(results: string[], outputType: OutputType): string {
  if (outputType === "paragraphs") {
    return results.join("\n\n");
  }
  return results.join(" ");
}

export async function generateText(
  apiBaseUrl: string | undefined,
  options: GenerateOptions,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<{ response: GenerateResponse; formattedText: string }> {
  const baseUrl = normalizeBaseUrl(apiBaseUrl);
  const payload = buildGeneratePayload(options);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = `Request failed with status ${res.status}`;
      let retryAfter: number | undefined;

      try {
        const errJson = (await res.json()) as {
          detail?: string;
          message?: string;
          retry_after?: number;
        };
        if (errJson.message) {
          detail = errJson.message;
        } else if (errJson.detail) {
          detail = errJson.detail;
        }
        if (typeof errJson.retry_after === "number") {
          retryAfter = errJson.retry_after;
        }
      } catch {
        // Ignore JSON parse errors on non-JSON error responses
      }

      if (res.status === 429 && retryAfter === undefined) {
        const headerVal = res.headers.get("Retry-After");
        if (headerVal) {
          const parsed = Number.parseInt(headerVal, 10);
          if (!Number.isNaN(parsed)) {
            retryAfter = parsed;
          }
        }
      }

      throw new ProlixoApiError(detail, res.status, retryAfter);
    }

    const data = (await res.json()) as Partial<GenerateResponse>;
    if (!Array.isArray(data?.results)) {
      throw new ProlixoApiError("Unexpected API response format.", res.status);
    }

    const normalized: GenerateResponse = {
      lang: data.lang ?? payload.lang,
      type: data.type ?? payload.type,
      theme: data.theme ?? payload.theme,
      count: data.count ?? payload.count,
      grammar_correct: data.grammar_correct ?? payload.grammar_correct,
      orthography_correct: data.orthography_correct ?? payload.orthography_correct,
      results: data.results,
    };

    return {
      response: normalized,
      formattedText: formatResults(normalized.results, normalized.type),
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ProlixoApiError(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`, 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
