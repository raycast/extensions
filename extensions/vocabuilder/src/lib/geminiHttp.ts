import { geminiError, type GeminiErrorSurface, type GeminiRateLimitDiagnostics } from "./geminiError";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function firstLine(value: string | undefined): string | undefined {
  return value?.split(/\r?\n/, 1)[0]?.slice(0, 240);
}

function extractRateLimitDiagnostics(body: string): GeminiRateLimitDiagnostics | undefined {
  const root = asRecord(JSON.parse(body));
  const error = asRecord(root?.error);
  if (!error) return undefined;

  const details = Array.isArray(error.details) ? error.details : [];
  const quotaFailure = details.map(asRecord).find((detail) => asString(detail?.["@type"])?.includes("QuotaFailure"));
  const firstViolation = Array.isArray(quotaFailure?.violations) ? asRecord(quotaFailure.violations[0]) : null;
  const quotaDimensions = asRecord(firstViolation?.quotaDimensions);
  const retryInfo = details.map(asRecord).find((detail) => asString(detail?.["@type"])?.includes("RetryInfo"));

  const diagnostics: GeminiRateLimitDiagnostics = {
    message: firstLine(asString(error.message)),
    quotaMetric: asString(firstViolation?.quotaMetric),
    quotaId: asString(firstViolation?.quotaId),
    quotaModel: asString(quotaDimensions?.model),
    quotaLocation: asString(quotaDimensions?.location),
    retryDelay: asString(retryInfo?.retryDelay),
  };

  return Object.values(diagnostics).some(Boolean) ? diagnostics : undefined;
}

function safeRateLimitDiagnostics(body: string): GeminiRateLimitDiagnostics | undefined {
  try {
    return extractRateLimitDiagnostics(body);
  } catch {
    return undefined;
  }
}

/**
 * Map a Gemini API HTTP response to the right `geminiError` and throw it.
 * Returns silently on `response.ok` so the caller can read the body.
 * Shared by translate (`gemini.ts`) and TTS (`tts.ts`) — keep status-code
 * handling in one place so the two transports stay in sync.
 */
export async function throwForHttpError(response: Response, surface: GeminiErrorSurface, model: string): Promise<void> {
  if (response.status === 401 || response.status === 403) {
    throw geminiError({ domain: "infrastructure", kind: "invalid-api-key", surface });
  }
  if (response.status === 404) {
    throw geminiError({ domain: "infrastructure", kind: "model-not-found", surface, model });
  }
  if (!response.ok) {
    let rawBody = "";
    let body = "";
    try {
      rawBody = await response.text();
      body = rawBody.slice(0, 500);
    } catch {
      // body unreadable - proceed with empty
    }
    throw geminiError({
      domain: "infrastructure",
      kind: "request-failed",
      surface,
      status: response.status,
      body,
      rateLimit: response.status === 429 ? safeRateLimitDiagnostics(rawBody) : undefined,
    });
  }
}
