import { describe, expect, it } from "vitest";

import { throwForHttpError } from "./geminiHttp";

const makeResponse = (status: number, body = ""): Response =>
  new Response(body, { status, statusText: `status-${status}` });

describe("throwForHttpError", () => {
  it("returns silently on 2xx", async () => {
    await expect(throwForHttpError(makeResponse(200), "translate", "m")).resolves.toBeUndefined();
  });

  it.each([401, 403])("maps %d to invalid-api-key with the caller's surface", async (status) => {
    await expect(throwForHttpError(makeResponse(status), "tts", "m")).rejects.toMatchObject({
      cause: {
        domain: "infrastructure",
        kind: "invalid-api-key",
        surface: "tts",
      },
    });
  });

  it("maps 404 to model-not-found and includes the model id", async () => {
    await expect(throwForHttpError(makeResponse(404), "translate", "gemini-bogus")).rejects.toMatchObject({
      cause: {
        domain: "infrastructure",
        kind: "model-not-found",
        surface: "translate",
        model: "gemini-bogus",
      },
    });
  });

  it.each([429, 500, 503])("maps other non-ok %d to request-failed with status + body", async (status) => {
    await expect(throwForHttpError(makeResponse(status, "server said no"), "translate", "m")).rejects.toMatchObject({
      cause: {
        domain: "infrastructure",
        kind: "request-failed",
        surface: "translate",
        status,
        body: "server said no",
      },
    });
  });

  it("extracts safe 429 quota diagnostics from Gemini error details", async () => {
    const body = JSON.stringify({
      error: {
        code: 429,
        message:
          "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests\nPlease retry in 21s.",
        status: "RESOURCE_EXHAUSTED",
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
            violations: [
              {
                quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
                quotaDimensions: { location: "global", model: "gemini-3-flash-preview" },
              },
            ],
          },
          {
            "@type": "type.googleapis.com/google.rpc.RetryInfo",
            retryDelay: "21s",
          },
        ],
      },
    });

    await expect(throwForHttpError(makeResponse(429, body), "translate", "m")).rejects.toMatchObject({
      cause: {
        status: 429,
        rateLimit: {
          message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests",
          quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
          quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
          quotaModel: "gemini-3-flash-preview",
          quotaLocation: "global",
          retryDelay: "21s",
        },
      },
    });
  });

  it("truncates oversized error bodies to 500 chars", async () => {
    const big = "x".repeat(2000);
    await expect(throwForHttpError(makeResponse(500, big), "tts", "m")).rejects.toMatchObject({
      cause: {
        body: expect.stringMatching(/^x{500}$/),
      },
    });
  });
});
