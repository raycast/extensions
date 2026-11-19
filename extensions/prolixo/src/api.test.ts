import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_API_URL,
  ProlixoApiError,
  buildGeneratePayload,
  formatResults,
  generateText,
  normalizeBaseUrl,
  parseCountArg,
} from "./api.ts";

describe("parseCountArg", () => {
  it("uses fallback when empty", () => {
    assert.equal(parseCountArg(undefined, 3), 3);
    assert.equal(parseCountArg("   ", 10), 10);
  });

  it("parses valid integers and rejects out-of-range or non-numeric values", () => {
    assert.equal(parseCountArg("5", 3), 5);
    assert.throws(() => parseCountArg("0", 3), /between 1 and 100/);
    assert.throws(() => parseCountArg("101", 3), /between 1 and 100/);
    assert.throws(() => parseCountArg("abc", 3), /between 1 and 100/);
  });
});

describe("normalizeBaseUrl", () => {
  it("falls back to production URL when empty", () => {
    assert.equal(normalizeBaseUrl(""), DEFAULT_API_URL);
    assert.equal(normalizeBaseUrl(undefined), DEFAULT_API_URL);
  });

  it("strips trailing slashes", () => {
    assert.equal(normalizeBaseUrl("https://prolixo.vercel.app///"), "https://prolixo.vercel.app");
  });

  it("rejects non-http(s) or malformed URLs", () => {
    assert.throws(() => normalizeBaseUrl("not-a-url"), /Invalid API Base URL/);
    assert.throws(() => normalizeBaseUrl("javascript:alert(1)"), /protocol/);
  });
});

describe("buildGeneratePayload", () => {
  it("validates count bounds", () => {
    assert.throws(
      () =>
        buildGeneratePayload({
          lang: "en",
          type: "words",
          theme: "business",
          count: 0,
          grammar_correct: true,
          orthography_correct: true,
        }),
      /between 1 and 100/,
    );
    assert.throws(
      () =>
        buildGeneratePayload({
          lang: "en",
          type: "words",
          theme: "business",
          count: 101,
          grammar_correct: true,
          orthography_correct: true,
        }),
      /between 1 and 100/,
    );
  });

  it("enforces Latin domain isolation", () => {
    const payload = buildGeneratePayload({
      lang: "la",
      type: "sentences",
      theme: "technology",
      count: 3,
      grammar_correct: false,
      orthography_correct: false,
    });
    assert.equal(payload.theme, "business");
    assert.equal(payload.grammar_correct, true);
    assert.equal(payload.orthography_correct, true);
  });
});

describe("formatResults", () => {
  it("joins paragraphs with blank lines and sentences with spaces", () => {
    assert.equal(formatResults(["P1.", "P2."], "paragraphs"), "P1.\n\nP2.");
    assert.equal(formatResults(["S1.", "S2."], "sentences"), "S1. S2.");
    assert.equal(formatResults(["alpha beta"], "words"), "alpha beta");
  });
});

describe("generateText", () => {
  it("calls /api/generate and formats output", async () => {
    let capturedUrl = "";
    let capturedBody = "";

    const mockFetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      capturedUrl = String(input);
      capturedBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          lang: "pt",
          type: "paragraphs",
          theme: "technology",
          count: 2,
          grammar_correct: true,
          orthography_correct: true,
          results: ["Primeiro parágrafo.", "Segundo parágrafo."],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const { formattedText } = await generateText(
      "https://prolixo.vercel.app/",
      {
        lang: "pt",
        type: "paragraphs",
        theme: "technology",
        count: 2,
        grammar_correct: true,
        orthography_correct: true,
      },
      mockFetch,
    );

    assert.equal(capturedUrl, "https://prolixo.vercel.app/api/generate");
    assert.match(capturedBody, /"lang":"pt"/);
    assert.equal(formattedText, "Primeiro parágrafo.\n\nSegundo parágrafo.");
  });

  it("throws ProlixoApiError with retryAfter on 429", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          error: "too_many_requests",
          message: "Rate limit exceeded. Please try again in 12 seconds.",
          retry_after: 12,
        }),
        { status: 429, headers: { "Retry-After": "12" } },
      )) as typeof fetch;

    await assert.rejects(
      () =>
        generateText(
          undefined,
          {
            lang: "en",
            type: "words",
            theme: "business",
            count: 5,
            grammar_correct: true,
            orthography_correct: true,
          },
          mockFetch,
        ),
      (err: unknown) => {
        assert.ok(err instanceof ProlixoApiError);
        assert.equal(err.status, 429);
        assert.equal(err.retryAfter, 12);
        return true;
      },
    );
  });

  it("rejects malformed 200 JSON without results array", async () => {
    const mockFetch = (async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })) as typeof fetch;

    await assert.rejects(
      () =>
        generateText(
          undefined,
          {
            lang: "en",
            type: "words",
            theme: "business",
            count: 5,
            grammar_correct: true,
            orthography_correct: true,
          },
          mockFetch,
        ),
      /Unexpected API response format/,
    );
  });

  it("times out cleanly when fetch aborts", async () => {
    const mockFetch = ((_input: Parameters<typeof fetch>[0], init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      })) as typeof fetch;

    await assert.rejects(
      () =>
        generateText(
          undefined,
          {
            lang: "en",
            type: "words",
            theme: "business",
            count: 5,
            grammar_correct: true,
            orthography_correct: true,
          },
          mockFetch,
          10,
        ),
      (err: unknown) => {
        assert.ok(err instanceof ProlixoApiError);
        assert.equal(err.status, 408);
        return true;
      },
    );
  });
});
