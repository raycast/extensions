import { describe, expect, it } from "vitest";

import { defaultToastFor } from "./errorToast";
import type { GeminiErrorCause } from "./geminiError";

describe("defaultToastFor", () => {
  // Tiny helper so each test reads as "infrastructure cause for kind X" without
  // redundant `domain: "infrastructure"` literals diluting the intent.
  const infra = (cause: Omit<Extract<GeminiErrorCause, { domain: "infrastructure" }>, "domain">) =>
    defaultToastFor({ ...cause, domain: "infrastructure" });

  it.each([
    ["network-offline", /internet/i],
    ["invalid-api-key", /api key/i],
  ] as const)("%s is surface-agnostic", (kind, titlePattern) => {
    const a = infra({ kind, surface: "translate" });
    const b = infra({ kind, surface: "tts" });

    expect(a).toEqual(b);
    expect(a.title).toMatch(titlePattern);
  });

  it("model-not-found references the correct preference name per surface", () => {
    const t = infra({ kind: "model-not-found", surface: "translate", model: "X" });
    const tts = infra({ kind: "model-not-found", surface: "tts", model: "X" });

    expect(t.message).toContain("Translation Model");
    expect(tts.message).toContain("Text-to-Speech Model");
    expect(t.message).toContain("X");
    expect(tts.message).toContain("X");
  });

  it("model-not-found falls back when model is missing", () => {
    const t = infra({ kind: "model-not-found", surface: "translate" });

    expect(t.message).toContain("the configured model");
  });

  it("request-failed title varies by surface", () => {
    const t = infra({ kind: "request-failed", surface: "translate", status: 503 });
    const tts = infra({ kind: "request-failed", surface: "tts", status: 503 });

    expect(t.title).toMatch(/translation/i);
    expect(tts.title).toMatch(/pronunciation/i);
  });

  it("request-failed surfaces the HTTP status in the message when present", () => {
    const t = infra({ kind: "request-failed", surface: "translate", status: 429 });

    expect(t.message).toContain("429");
  });

  it("request-failed omits status when not present", () => {
    const t = infra({ kind: "request-failed", surface: "translate" });

    expect(t.message).not.toMatch(/\d{3}/);
  });

  it("empty-response title varies by surface", () => {
    const t = infra({ kind: "empty-response", surface: "translate" });
    const tts = infra({ kind: "empty-response", surface: "tts" });

    expect(t.title).toMatch(/empty/i);
    expect(tts.title).toMatch(/audio/i);
  });

  it("invalid-response is surface-agnostic", () => {
    const a = defaultToastFor({ kind: "invalid-response", surface: "translate", domain: "infrastructure" });
    const b = defaultToastFor({ kind: "invalid-response", surface: "tts", domain: "infrastructure" });

    expect(a).toEqual(b);
  });

  it("word-not-found uses outcome-specific copy distinct from infrastructure errors", () => {
    const t = defaultToastFor({ kind: "word-not-found", surface: "translate", domain: "outcome" });

    expect(t.title).toMatch(/not recognized/i);
    expect(t.message).not.toMatch(/try again/i);
  });

  it("invalid-word-input surfaces the input-shape constraints from src/lib/input.ts", () => {
    const t = defaultToastFor({ kind: "invalid-word-input", surface: "translate", domain: "outcome" });

    expect(t.message).toMatch(/\d+\s+words/);
    expect(t.message).toMatch(/\d+\s+chars/);
  });

  it("invalid-text-input has its own copy", () => {
    const t = defaultToastFor({ kind: "invalid-text-input", surface: "translate", domain: "outcome" });

    expect(t.message).toMatch(/empty|too long/i);
  });
});
