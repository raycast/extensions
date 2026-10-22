import { describe, expect, it } from "vitest";

import {
  providerError,
  providerErrorLogFields,
  isProviderError,
  isOutcome,
  isTransient,
  type ProviderError,
  type ProviderInfrastructureCause,
  type ProviderOutcomeKind,
} from "./providerError";

describe("providerError + isProviderError", () => {
  it("builds an Error whose message mirrors kind and whose cause carries the tag", () => {
    const e = providerError({
      kind: "model-not-found",
      surface: "tts",
      domain: "infrastructure",
      provider: "gemini",
      model: "x",
    });
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("model-not-found");
    expect(e.cause).toEqual({
      kind: "model-not-found",
      surface: "tts",
      domain: "infrastructure",
      provider: "gemini",
      model: "x",
    });
  });

  it("isProviderError narrows a tagged Error", () => {
    const e = providerError({
      kind: "network-offline",
      surface: "translate",
      domain: "infrastructure",
      provider: "gemini",
    });
    expect(isProviderError(e)).toBe(true);
  });

  it("isProviderError rejects plain Errors (no cause)", () => {
    expect(isProviderError(new Error("WORD_NOT_FOUND"))).toBe(false);
  });

  it("isProviderError rejects Errors whose cause lacks the tag", () => {
    expect(isProviderError(new Error("x", { cause: { status: 500 } }))).toBe(false);
  });

  it("isProviderError rejects causes missing the domain discriminator", () => {
    // A cause shape from before the domain refactor must not be recognized as a
    // current ProviderError, otherwise downstream switches on domain go wrong.
    expect(isProviderError(new Error("x", { cause: { kind: "network-offline", surface: "translate" } }))).toBe(false);
  });

  it("isProviderError rejects non-Error values", () => {
    expect(isProviderError("network-offline")).toBe(false);
    expect(isProviderError(null)).toBe(false);
    expect(
      isProviderError({ kind: "network-offline", surface: "tts", domain: "infrastructure", provider: "gemini" }),
    ).toBe(false);
  });
});

describe("isOutcome", () => {
  it("matches outcome-domain provider errors", () => {
    expect(isOutcome(providerError({ kind: "word-not-found", surface: "translate", domain: "outcome" }))).toBe(true);
    expect(isOutcome(providerError({ kind: "invalid-word-input", surface: "translate", domain: "outcome" }))).toBe(
      true,
    );
    expect(isOutcome(providerError({ kind: "invalid-text-input", surface: "translate", domain: "outcome" }))).toBe(
      true,
    );
  });

  it("rejects infrastructure-domain provider errors", () => {
    expect(
      isOutcome(
        providerError({ kind: "network-offline", surface: "translate", domain: "infrastructure", provider: "gemini" }),
      ),
    ).toBe(false);
    expect(
      isOutcome(
        providerError({ kind: "request-failed", surface: "tts", domain: "infrastructure", provider: "gemini" }),
      ),
    ).toBe(false);
  });

  it("rejects non-provider errors", () => {
    expect(isOutcome(new Error("anything"))).toBe(false);
  });
});

describe("isTransient", () => {
  const infra = (cause: ProviderInfrastructureCause): ProviderError => providerError(cause);
  const outcome = (kind: ProviderOutcomeKind): ProviderError =>
    providerError({ kind, surface: "translate", domain: "outcome" });

  it("network-offline is transient", () => {
    expect(
      isTransient(
        infra({ kind: "network-offline", surface: "translate", domain: "infrastructure", provider: "gemini" }),
      ),
    ).toBe(true);
  });

  it("5xx request-failed is transient", () => {
    expect(
      isTransient(
        infra({ kind: "request-failed", surface: "tts", domain: "infrastructure", provider: "gemini", status: 503 }),
      ),
    ).toBe(true);
  });

  it("429 and 408 are transient", () => {
    expect(
      isTransient(
        infra({
          kind: "request-failed",
          surface: "translate",
          domain: "infrastructure",
          provider: "gemini",
          status: 429,
        }),
      ),
    ).toBe(true);
    expect(
      isTransient(
        infra({
          kind: "request-failed",
          surface: "translate",
          domain: "infrastructure",
          provider: "gemini",
          status: 408,
        }),
      ),
    ).toBe(true);
  });

  it("4xx (other than 429/408) is NOT transient", () => {
    expect(
      isTransient(
        infra({
          kind: "request-failed",
          surface: "translate",
          domain: "infrastructure",
          provider: "gemini",
          status: 400,
        }),
      ),
    ).toBe(false);
    expect(
      isTransient(
        infra({
          kind: "request-failed",
          surface: "translate",
          domain: "infrastructure",
          provider: "gemini",
          status: 404,
        }),
      ),
    ).toBe(false);
  });

  it("invalid-api-key, model-not-found, invalid-base-url, empty/invalid-response are NOT transient", () => {
    expect(
      isTransient(infra({ kind: "invalid-api-key", surface: "tts", domain: "infrastructure", provider: "gemini" })),
    ).toBe(false);
    expect(
      isTransient(
        infra({ kind: "invalid-base-url", surface: "translate", domain: "infrastructure", provider: "gemini" }),
      ),
    ).toBe(false);
    expect(
      isTransient(
        infra({ kind: "model-not-found", surface: "tts", domain: "infrastructure", provider: "gemini", model: "x" }),
      ),
    ).toBe(false);
    expect(
      isTransient(
        infra({ kind: "empty-response", surface: "translate", domain: "infrastructure", provider: "gemini" }),
      ),
    ).toBe(false);
    expect(
      isTransient(infra({ kind: "invalid-response", surface: "tts", domain: "infrastructure", provider: "gemini" })),
    ).toBe(false);
  });

  it("configuration kinds are NOT transient — they need a preferences change first", () => {
    expect(
      isTransient(
        infra({ kind: "provider-undetected", surface: "translate", domain: "infrastructure", provider: "unknown" }),
      ),
    ).toBe(false);
    expect(
      isTransient(
        infra({ kind: "missing-model", surface: "translate", domain: "infrastructure", provider: "openai-compatible" }),
      ),
    ).toBe(false);
  });

  it("outcome-domain errors are NEVER transient — deterministic verdicts, not retryable", () => {
    expect(isTransient(outcome("word-not-found"))).toBe(false);
    expect(isTransient(outcome("invalid-word-input"))).toBe(false);
    expect(isTransient(outcome("invalid-text-input"))).toBe(false);
  });
});

describe("providerErrorLogFields", () => {
  it("returns just the error name for a plain Error", () => {
    expect(providerErrorLogFields(new TypeError("nope"))).toEqual({ error: "TypeError" });
  });

  it("returns error: 'unknown' for a non-Error value", () => {
    expect(providerErrorLogFields("oops")).toEqual({ error: "unknown" });
    expect(providerErrorLogFields(null)).toEqual({ error: "unknown" });
  });

  it("flattens outcome-domain errors without rateLimit/status fields", () => {
    const err = providerError({ kind: "word-not-found", surface: "translate", domain: "outcome" });
    expect(providerErrorLogFields(err)).toEqual({
      error: "word-not-found",
      domain: "outcome",
      provider: undefined,
      status: undefined,
      quotaMetric: undefined,
      quotaId: undefined,
      quotaModel: undefined,
      quotaLocation: undefined,
      retryDelay: undefined,
      message: undefined,
    });
  });

  it("names the provider so logs from different backends can be told apart", () => {
    const err = providerError({
      kind: "request-failed",
      surface: "translate",
      domain: "infrastructure",
      provider: "anthropic",
      status: 529,
    });
    expect(providerErrorLogFields(err)).toMatchObject({ provider: "anthropic", status: 529 });
  });

  it("flattens infrastructure errors with status but no rateLimit", () => {
    const err = providerError({
      kind: "request-failed",
      surface: "tts",
      domain: "infrastructure",
      provider: "gemini",
      status: 500,
    });
    expect(providerErrorLogFields(err)).toMatchObject({
      error: "request-failed",
      domain: "infrastructure",
      provider: "gemini",
      status: 500,
      quotaMetric: undefined,
      retryDelay: undefined,
      message: undefined,
    });
  });

  it("surfaces every rate-limit diagnostic when present (including message)", () => {
    // The message field is the one that silently drifted between the translate
    // and TTS call sites before — guard it explicitly here.
    const err = providerError({
      kind: "request-failed",
      surface: "translate",
      domain: "infrastructure",
      provider: "gemini",
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
    expect(providerErrorLogFields(err)).toEqual({
      error: "request-failed",
      domain: "infrastructure",
      provider: "gemini",
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
