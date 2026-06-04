import { describe, it, expect } from "vitest";
import { z } from "zod";
import VocabuilderTranslateWordProvider, {
  EvalVarsSchema,
  describeFailure,
  parseOrThrow,
  projectKnownErrorOrNull,
} from "./provider";
import { geminiError } from "../../src/lib/geminiError";
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

  it("projects word-not-found outcome (Gemini said notAWord) as an app-level eval error", () => {
    const err = geminiError({ domain: "outcome", kind: "word-not-found", surface: "translate" });
    expect(projectKnownErrorOrNull(err, "xqfjvbn", pair)).toEqual({
      status: "error",
      input: "xqfjvbn",
      languagePair: pair,
      error: "word-not-found",
    });
  });

  it("projects invalid-word-input outcome (failed normalizeWordInput) as an app-level eval error", () => {
    const err = geminiError({ domain: "outcome", kind: "invalid-word-input", surface: "translate" });
    expect(projectKnownErrorOrNull(err, "", pair)).toMatchObject({
      status: "error",
      error: "invalid-word-input",
    });
  });

  // Infrastructure errors — including invalid-response — should NOT be projected
  // as app-level outputs. The schema failure means Gemini misbehaved, not that
  // the input was deterministically rejected; the eval should error/skip the
  // case, not pass an assertion against it.
  it("returns null for infrastructure-domain errors so the caller surfaces them as provider failures", () => {
    const cases = [
      geminiError({ domain: "infrastructure", kind: "network-offline", surface: "translate" }),
      geminiError({ domain: "infrastructure", kind: "invalid-response", surface: "translate" }),
      geminiError({ domain: "infrastructure", kind: "request-failed", surface: "translate", status: 500 }),
      geminiError({ domain: "infrastructure", kind: "invalid-api-key", surface: "translate" }),
    ];
    for (const err of cases) {
      expect(projectKnownErrorOrNull(err, "hello", pair)).toBeNull();
    }
  });

  it("returns null for non-Gemini errors (legacy SCREAMING_SNAKE strings, plain Error, etc.)", () => {
    expect(projectKnownErrorOrNull(new Error("WORD_NOT_FOUND"), "x", pair)).toBeNull();
    expect(projectKnownErrorOrNull(new Error("anything-else"), "x", pair)).toBeNull();
    expect(projectKnownErrorOrNull("not even an error", "x", pair)).toBeNull();
  });
});

describe("describeFailure", () => {
  it("returns the bare kind for an infrastructure error with no status or body", () => {
    const err = geminiError({ domain: "infrastructure", kind: "network-offline", surface: "translate" });
    expect(describeFailure(err)).toBe("network-offline");
  });

  it("folds HTTP status and response body into the reason", () => {
    const err = geminiError({
      domain: "infrastructure",
      kind: "request-failed",
      surface: "translate",
      status: 400,
      body: '{"error":{"message":"Invalid JSON payload"}}',
    });
    expect(describeFailure(err)).toBe('request-failed — HTTP 400 — {"error":{"message":"Invalid JSON payload"}}');
  });

  it("surfaces rate-limit retryDelay and message for a 429", () => {
    const err = geminiError({
      domain: "infrastructure",
      kind: "request-failed",
      surface: "translate",
      status: 429,
      body: "raw body",
      rateLimit: { retryDelay: "21s", message: "Quota exceeded" },
    });
    // rateLimit.message wins over body as the human-readable detail.
    expect(describeFailure(err)).toBe("request-failed — HTTP 429 — retryDelay 21s — Quota exceeded");
  });

  it("uses name and message for a non-Gemini Error", () => {
    expect(describeFailure(new TypeError("boom"))).toBe("TypeError: boom");
  });

  it("stringifies a non-Error value", () => {
    expect(describeFailure("just a string")).toBe("just a string");
  });
});

describe("VocabuilderTranslateWordProvider constructor", () => {
  // Promptfoo silently treating a missing temperature as 0 would mask config bugs
  // and let two YAMLs diverge from the documented eval setup. Fail loud at load.
  it("throws when promptfoo passes no config", () => {
    expect(() => new VocabuilderTranslateWordProvider()).toThrow(/temperature/);
  });

  it("throws when promptfoo passes a config without temperature", () => {
    expect(() => new VocabuilderTranslateWordProvider({ config: {} })).toThrow(/temperature/);
  });

  it("accepts a valid config", () => {
    expect(() => new VocabuilderTranslateWordProvider({ config: { temperature: 0 } })).not.toThrow();
  });
});
