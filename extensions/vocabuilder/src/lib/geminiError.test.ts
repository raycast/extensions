import { describe, expect, it } from "vitest";

import {
  geminiError,
  geminiErrorLogFields,
  isGeminiError,
  isOutcome,
  isTransient,
  type GeminiError,
  type GeminiInfrastructureCause,
  type GeminiOutcomeKind,
} from "./geminiError";

describe("geminiError + isGeminiError", () => {
  it("builds an Error whose message mirrors kind and whose cause carries the tag", () => {
    const e = geminiError({ kind: "model-not-found", surface: "tts", domain: "infrastructure", model: "x" });
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("model-not-found");
    expect(e.cause).toEqual({ kind: "model-not-found", surface: "tts", domain: "infrastructure", model: "x" });
  });

  it("isGeminiError narrows a tagged Error", () => {
    const e = geminiError({ kind: "network-offline", surface: "translate", domain: "infrastructure" });
    expect(isGeminiError(e)).toBe(true);
  });

  it("isGeminiError rejects plain Errors (no cause)", () => {
    expect(isGeminiError(new Error("WORD_NOT_FOUND"))).toBe(false);
  });

  it("isGeminiError rejects Errors whose cause lacks the tag", () => {
    expect(isGeminiError(new Error("x", { cause: { status: 500 } }))).toBe(false);
  });

  it("isGeminiError rejects causes missing the domain discriminator", () => {
    // A cause shape from before the domain refactor must not be recognized as a
    // current GeminiError, otherwise downstream switches on domain go wrong.
    expect(isGeminiError(new Error("x", { cause: { kind: "network-offline", surface: "translate" } }))).toBe(false);
  });

  it("isGeminiError rejects non-Error values", () => {
    expect(isGeminiError("network-offline")).toBe(false);
    expect(isGeminiError(null)).toBe(false);
    expect(isGeminiError({ kind: "network-offline", surface: "tts", domain: "infrastructure" })).toBe(false);
  });
});

describe("isOutcome", () => {
  it("matches outcome-domain Gemini errors", () => {
    expect(isOutcome(geminiError({ kind: "word-not-found", surface: "translate", domain: "outcome" }))).toBe(true);
    expect(isOutcome(geminiError({ kind: "invalid-word-input", surface: "translate", domain: "outcome" }))).toBe(true);
    expect(isOutcome(geminiError({ kind: "invalid-text-input", surface: "translate", domain: "outcome" }))).toBe(true);
  });

  it("rejects infrastructure-domain Gemini errors", () => {
    expect(isOutcome(geminiError({ kind: "network-offline", surface: "translate", domain: "infrastructure" }))).toBe(
      false,
    );
    expect(isOutcome(geminiError({ kind: "request-failed", surface: "tts", domain: "infrastructure" }))).toBe(false);
  });

  it("rejects non-Gemini errors", () => {
    expect(isOutcome(new Error("anything"))).toBe(false);
  });
});

describe("isTransient", () => {
  const infra = (cause: GeminiInfrastructureCause): GeminiError => geminiError(cause);
  const outcome = (kind: GeminiOutcomeKind): GeminiError =>
    geminiError({ kind, surface: "translate", domain: "outcome" });

  it("network-offline is transient", () => {
    expect(isTransient(infra({ kind: "network-offline", surface: "translate", domain: "infrastructure" }))).toBe(true);
  });

  it("5xx request-failed is transient", () => {
    expect(isTransient(infra({ kind: "request-failed", surface: "tts", domain: "infrastructure", status: 503 }))).toBe(
      true,
    );
  });

  it("429 and 408 are transient", () => {
    expect(
      isTransient(infra({ kind: "request-failed", surface: "translate", domain: "infrastructure", status: 429 })),
    ).toBe(true);
    expect(
      isTransient(infra({ kind: "request-failed", surface: "translate", domain: "infrastructure", status: 408 })),
    ).toBe(true);
  });

  it("4xx (other than 429/408) is NOT transient", () => {
    expect(
      isTransient(infra({ kind: "request-failed", surface: "translate", domain: "infrastructure", status: 400 })),
    ).toBe(false);
    expect(
      isTransient(infra({ kind: "request-failed", surface: "translate", domain: "infrastructure", status: 404 })),
    ).toBe(false);
  });

  it("invalid-api-key, model-not-found, empty/invalid-response are NOT transient", () => {
    expect(isTransient(infra({ kind: "invalid-api-key", surface: "tts", domain: "infrastructure" }))).toBe(false);
    expect(isTransient(infra({ kind: "model-not-found", surface: "tts", domain: "infrastructure", model: "x" }))).toBe(
      false,
    );
    expect(isTransient(infra({ kind: "empty-response", surface: "translate", domain: "infrastructure" }))).toBe(false);
    expect(isTransient(infra({ kind: "invalid-response", surface: "tts", domain: "infrastructure" }))).toBe(false);
  });

  it("outcome-domain errors are NEVER transient — deterministic verdicts, not retryable", () => {
    expect(isTransient(outcome("word-not-found"))).toBe(false);
    expect(isTransient(outcome("invalid-word-input"))).toBe(false);
    expect(isTransient(outcome("invalid-text-input"))).toBe(false);
  });
});

describe("geminiErrorLogFields", () => {
  it("returns just the error name for a plain Error", () => {
    expect(geminiErrorLogFields(new TypeError("nope"))).toEqual({ error: "TypeError" });
  });

  it("returns error: 'unknown' for a non-Error value", () => {
    expect(geminiErrorLogFields("oops")).toEqual({ error: "unknown" });
    expect(geminiErrorLogFields(null)).toEqual({ error: "unknown" });
  });

  it("flattens outcome-domain errors without rateLimit/status fields", () => {
    const err = geminiError({ kind: "word-not-found", surface: "translate", domain: "outcome" });
    expect(geminiErrorLogFields(err)).toEqual({
      error: "word-not-found",
      domain: "outcome",
      status: undefined,
      quotaMetric: undefined,
      quotaId: undefined,
      quotaModel: undefined,
      quotaLocation: undefined,
      retryDelay: undefined,
      message: undefined,
    });
  });

  it("flattens infrastructure errors with status but no rateLimit", () => {
    const err = geminiError({
      kind: "request-failed",
      surface: "tts",
      domain: "infrastructure",
      status: 500,
    });
    expect(geminiErrorLogFields(err)).toMatchObject({
      error: "request-failed",
      domain: "infrastructure",
      status: 500,
      quotaMetric: undefined,
      retryDelay: undefined,
      message: undefined,
    });
  });

  it("surfaces every rate-limit diagnostic when present (including message)", () => {
    // The message field is the one that silently drifted between gemini.ts and
    // tts.ts before — guard it explicitly here.
    const err = geminiError({
      kind: "request-failed",
      surface: "translate",
      domain: "infrastructure",
      status: 429,
      rateLimit: {
        message: "Quota exceeded for requests per minute",
        quotaMetric: "generativelanguage.googleapis.com/generate_content_requests",
        quotaId: "GenerateRequestsPerMinutePerProjectPerModel",
        quotaModel: "gemini-3-flash-preview",
        quotaLocation: "global",
        retryDelay: "30s",
      },
    });
    expect(geminiErrorLogFields(err)).toEqual({
      error: "request-failed",
      domain: "infrastructure",
      status: 429,
      quotaMetric: "generativelanguage.googleapis.com/generate_content_requests",
      quotaId: "GenerateRequestsPerMinutePerProjectPerModel",
      quotaModel: "gemini-3-flash-preview",
      quotaLocation: "global",
      retryDelay: "30s",
      message: "Quota exceeded for requests per minute",
    });
  });
});
