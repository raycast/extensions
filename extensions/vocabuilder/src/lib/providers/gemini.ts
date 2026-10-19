import { z } from "zod";
import { resolveBaseUrl } from "../baseUrl";
import { createLogger } from "../logger";
import { providerError, type RateLimitDiagnostics } from "../providerError";
import { postWithRetry, readApiResponse, stripCodeFences } from "./transport";
import type { JsonTransport } from "./types";

const log = createLogger("gemini");

const GeminiApiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(z.object({ text: z.string() })),
      }),
    }),
  ),
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function firstLine(value: string | undefined): string | undefined {
  return value?.split(/\r?\n/, 1)[0]?.slice(0, 240);
}

/** Quota details from a Gemini 429 body (`google.rpc.QuotaFailure` / `RetryInfo`). Shared with Gemini TTS. */
export function parseGeminiRateLimit(body: string): RateLimitDiagnostics | undefined {
  const root = asRecord(JSON.parse(body));
  const error = asRecord(root?.error);
  if (!error) return undefined;

  const details = Array.isArray(error.details) ? error.details : [];
  const quotaFailure = details.map(asRecord).find((detail) => asString(detail?.["@type"])?.includes("QuotaFailure"));
  const firstViolation = Array.isArray(quotaFailure?.violations) ? asRecord(quotaFailure.violations[0]) : null;
  const quotaDimensions = asRecord(firstViolation?.quotaDimensions);
  const retryInfo = details.map(asRecord).find((detail) => asString(detail?.["@type"])?.includes("RetryInfo"));

  const diagnostics: RateLimitDiagnostics = {
    message: firstLine(asString(error.message)),
    quotaMetric: asString(firstViolation?.quotaMetric),
    quotaId: asString(firstViolation?.quotaId),
    quotaModel: asString(quotaDimensions?.model),
    quotaLocation: asString(quotaDimensions?.location),
    retryDelay: asString(retryInfo?.retryDelay),
  };

  return Object.values(diagnostics).some(Boolean) ? diagnostics : undefined;
}

export const geminiJsonTransport: JsonTransport = async (config, req) => {
  const model = config.model.trim();
  const resolvedBaseUrl = resolveBaseUrl(config.baseUrl, "gemini", "translate");
  const totalMs = log.timer();

  const response = await postWithRetry({
    url: `${resolvedBaseUrl}/${model}:generateContent`,
    headers: { "x-goog-api-key": config.apiKey },
    body: {
      contents: [{ parts: [{ text: req.prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: req.schema,
      },
    },
    signal: req.signal,
    context: {
      provider: "gemini",
      surface: "translate",
      model,
      resolvedBaseUrl,
      parseRateLimit: parseGeminiRateLimit,
    },
  });

  const apiData = await readApiResponse(response, GeminiApiResponseSchema, {
    provider: "gemini",
    surface: "translate",
    signal: req.signal,
  });
  const raw = apiData.candidates[0]?.content.parts[0]?.text ?? "";

  if (!raw) {
    throw providerError({ domain: "infrastructure", kind: "empty-response", surface: "translate", provider: "gemini" });
  }

  log.debug("translation request completed", { model, totalMs: totalMs(), responseChars: raw.length });
  return stripCodeFences(raw);
};
