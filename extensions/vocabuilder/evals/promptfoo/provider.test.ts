import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { z } from "zod";
import VocabuilderTranslateWordProvider, {
  EvalVarsSchema,
  describeFailure,
  parseOrThrow,
  projectKnownErrorOrNull,
} from "./provider";
import { providerError } from "../../src/lib/providerError";
import type { LanguagePair } from "../../src/lib/languages";

describe("EvalVarsSchema", () => {
  const validVars = {
    sourceLanguageCode: "en",
    sourceLanguageName: "English",
    targetLanguageCode: "uk",
    targetLanguageName: "Ukrainian",
  };

  it("transforms required vars into a LanguagePair", () => {
    const result = EvalVarsSchema.parse(validVars);
    expect(result).toEqual({
      pair: {
        source: { code: "en", name: "English" },
        target: { code: "uk", name: "Ukrainian" },
      },
      input: undefined,
    });
  });

  it("carries through optional input when provided", () => {
    const result = EvalVarsSchema.parse({ ...validVars, input: "hello" });
    expect(result.input).toBe("hello");
  });

  it("trims surrounding whitespace from string fields", () => {
    const result = EvalVarsSchema.parse({
      sourceLanguageCode: "  en  ",
      sourceLanguageName: " English ",
      targetLanguageCode: "uk",
      targetLanguageName: "Ukrainian",
      input: "  hello  ",
    });
    expect(result.pair.source).toEqual({ code: "en", name: "English" });
    expect(result.input).toBe("hello");
  });

  it("rejects whitespace-only strings as missing", () => {
    const result = EvalVarsSchema.safeParse({ ...validVars, sourceLanguageCode: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("sourceLanguageCode");
    }
  });

  it("reports missing required fields by path", () => {
    const result = EvalVarsSchema.safeParse({ sourceLanguageCode: "en", sourceLanguageName: "English" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("targetLanguageCode");
      expect(paths).toContain("targetLanguageName");
    }
  });
});

describe("parseOrThrow", () => {
  const schema = z.object({ a: z.string(), b: z.number() });

  it("throws with prefix, dotted field paths, and hint on failure", () => {
    expect(() => parseOrThrow(schema, { a: 1 }, "Bad input", "set a and b in the config.")).toThrow(
      /^Bad input \(a, b\) — set a and b in the config\.$/,
    );
  });
});

describe("projectKnownErrorOrNull", () => {
  const pair: LanguagePair = {
    source: { code: "en", name: "English" },
    target: { code: "uk", name: "Ukrainian" },
  };

  it("projects word-not-found outcome (the model said notAWord) as an app-level eval error", () => {
    const err = providerError({ domain: "outcome", kind: "word-not-found", surface: "translate" });
    expect(projectKnownErrorOrNull(err, "xqfjvbn", pair)).toEqual({
      status: "error",
      input: "xqfjvbn",
      languagePair: pair,
      error: "word-not-found",
    });
  });

  it("projects invalid-word-input outcome (failed normalizeWordInput) as an app-level eval error", () => {
    const err = providerError({ domain: "outcome", kind: "invalid-word-input", surface: "translate" });
    expect(projectKnownErrorOrNull(err, "", pair)).toMatchObject({
      status: "error",
      error: "invalid-word-input",
    });
  });

  // Infrastructure errors — including invalid-response — should NOT be projected
  // as app-level outputs. The schema failure means the provider misbehaved, not that
  // the input was deterministically rejected; the eval should error/skip the
  // case, not pass an assertion against it.
  it("returns null for infrastructure-domain errors so the caller surfaces them as provider failures", () => {
    const cases = [
      providerError({ domain: "infrastructure", provider: "gemini", kind: "network-offline", surface: "translate" }),
      providerError({ domain: "infrastructure", provider: "gemini", kind: "invalid-response", surface: "translate" }),
      providerError({
        domain: "infrastructure",
        provider: "gemini",
        kind: "request-failed",
        surface: "translate",
        status: 500,
      }),
      providerError({ domain: "infrastructure", provider: "gemini", kind: "invalid-api-key", surface: "translate" }),
    ];
    for (const err of cases) {
      expect(projectKnownErrorOrNull(err, "hello", pair)).toBeNull();
    }
  });

  it("returns null for non-provider errors (legacy SCREAMING_SNAKE strings, plain Error, etc.)", () => {
    expect(projectKnownErrorOrNull(new Error("WORD_NOT_FOUND"), "x", pair)).toBeNull();
    expect(projectKnownErrorOrNull(new Error("anything-else"), "x", pair)).toBeNull();
    expect(projectKnownErrorOrNull("not even an error", "x", pair)).toBeNull();
  });
});

describe("describeFailure", () => {
  it("returns the bare kind for an infrastructure error with no status or body", () => {
    const err = providerError({
      domain: "infrastructure",
      provider: "gemini",
      kind: "network-offline",
      surface: "translate",
    });
    expect(describeFailure(err)).toBe("network-offline");
  });

  it("folds HTTP status and response body into the reason", () => {
    const err = providerError({
      domain: "infrastructure",
      provider: "gemini",
      kind: "request-failed",
      surface: "translate",
      status: 400,
      body: '{"error":{"message":"Invalid JSON payload"}}',
    });
    expect(describeFailure(err)).toBe('request-failed — HTTP 400 — {"error":{"message":"Invalid JSON payload"}}');
  });

  it("surfaces rate-limit retryDelay and message for a 429", () => {
    const err = providerError({
      domain: "infrastructure",
      provider: "gemini",
      kind: "request-failed",
      surface: "translate",
      status: 429,
      body: "raw body",
      rateLimit: { retryDelay: "21s", message: "Quota exceeded" },
    });
    // rateLimit.message wins over body as the human-readable detail.
    expect(describeFailure(err)).toBe("request-failed — HTTP 429 — retryDelay 21s — Quota exceeded");
  });

  it("uses name and message for a non-provider Error", () => {
    expect(describeFailure(new TypeError("boom"))).toBe("TypeError: boom");
  });

  it("stringifies a non-Error value", () => {
    expect(describeFailure("just a string")).toBe("just a string");
  });
});

describe("VocabuilderTranslateWordProvider", () => {
  const vars = {
    input: "hello",
    sourceLanguageCode: "en",
    sourceLanguageName: "English",
    targetLanguageCode: "uk",
    targetLanguageName: "Ukrainian",
  };
  const callWith = (provider: VocabuilderTranslateWordProvider) =>
    provider.callApi("hello", { vars } as unknown as Parameters<typeof provider.callApi>[1]);

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    for (const name of [
      "GEMINI_API_KEY",
      "ANTHROPIC_API_KEY",
      "OPENAI_API_KEY",
      "OPENAI_COMPATIBLE_API_KEY",
      "OPENAI_COMPATIBLE_BASE_URL",
    ]) {
      vi.stubEnv(name, "");
    }
    // 401 is never retried, so each call makes exactly one request.
    fetchMock = vi.fn(async () => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function sentRequest(): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return {
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(init.body as string) as Record<string, unknown>,
    };
  }

  it("rejects a YAML entry without a known provider id", () => {
    expect(() => new VocabuilderTranslateWordProvider({ config: {} })).toThrow(/^Invalid provider config \(provider\)/);
    expect(() => new VocabuilderTranslateWordProvider({ config: { provider: "mistral" } })).toThrow(
      /Invalid provider config \(provider\)/,
    );
  });

  it("names itself after its provider so side-by-side results stay distinct", () => {
    expect(new VocabuilderTranslateWordProvider({ config: { provider: "anthropic" } }).id()).toBe(
      "vocabuilder-anthropic",
    );
  });

  // `promptfoo validate` instantiates every entry, so a missing key must not fail construction.
  it("constructs without credentials and fails loudly on the first call, naming the missing variable", async () => {
    const provider = new VocabuilderTranslateWordProvider({ config: { provider: "anthropic" } });
    await expect(callWith(provider)).rejects.toThrow(/ANTHROPIC_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires both the key and the server URL for an openai-compatible entry", async () => {
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "local");
    const provider = new VocabuilderTranslateWordProvider({
      config: { provider: "openai-compatible", model: "llama3" },
    });
    await expect(callWith(provider)).rejects.toThrow(/OPENAI_COMPATIBLE_BASE_URL/);
  });

  it("sends the Anthropic key from ANTHROPIC_API_KEY to the Anthropic API", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-eval");
    vi.stubEnv("GEMINI_API_KEY", "AIza-not-this-one");
    const provider = new VocabuilderTranslateWordProvider({ config: { provider: "anthropic" } });

    await expect(callWith(provider)).resolves.toEqual({ error: "invalid-api-key" });
    const { url, headers } = sentRequest();
    expect(new URL(url).host).toBe("api.anthropic.com");
    expect(headers["x-api-key"]).toBe("sk-ant-eval");
  });

  it("uses Gemini Flash-Lite by default and keeps a custom model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "AIza-eval");
    await callWith(new VocabuilderTranslateWordProvider({ config: { provider: "gemini" } }));
    expect(sentRequest().url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    );

    fetchMock.mockClear();
    await callWith(new VocabuilderTranslateWordProvider({ config: { provider: "gemini", model: "gemini-custom" } }));
    expect(sentRequest().url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-custom:generateContent",
    );
  });

  it("uses GPT-6 Luna with no reasoning by default and keeps a custom model's effort", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-eval");
    await callWith(new VocabuilderTranslateWordProvider({ config: { provider: "openai" } }));
    const defaulted = sentRequest();
    expect(new URL(defaulted.url).host).toBe("api.openai.com");
    expect(defaulted.headers.Authorization).toBe("Bearer sk-eval");
    expect(defaulted.body.model).toBe("gpt-6-luna");
    expect(defaulted.body.reasoning_effort).toBe("none");

    fetchMock.mockClear();
    await callWith(new VocabuilderTranslateWordProvider({ config: { provider: "openai", model: "gpt-custom" } }));
    expect(sentRequest().body.model).toBe("gpt-custom");
    expect(sentRequest().body).not.toHaveProperty("reasoning_effort");
  });

  it("routes an openai-compatible entry to OPENAI_COMPATIBLE_BASE_URL with its configured model", async () => {
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "local");
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "http://localhost:11434/v1");
    const provider = new VocabuilderTranslateWordProvider({
      config: { provider: "openai-compatible", model: "llama3" },
    });

    await callWith(provider);
    const { url, body } = sentRequest();
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(body.model).toBe("llama3");
  });

  it("surfaces missing-model for an openai-compatible entry without a model", async () => {
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "local");
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "http://localhost:11434/v1");
    const provider = new VocabuilderTranslateWordProvider({ config: { provider: "openai-compatible" } });
    await expect(callWith(provider)).rejects.toThrow("missing-model");
  });
});
