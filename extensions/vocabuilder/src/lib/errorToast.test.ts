import { describe, expect, it } from "vitest";

import { defaultToastFor } from "./errorToast";
import type { ProviderInfrastructureCause } from "./providerError";
import { PROVIDER_IDS } from "./providers/types";

describe("defaultToastFor", () => {
  // Tiny helper so each test reads as "infrastructure cause for kind X" without
  // redundant `domain`/`provider` literals diluting the intent.
  const infra = (
    cause: Omit<ProviderInfrastructureCause, "domain" | "provider"> & Partial<ProviderInfrastructureCause>,
  ) => defaultToastFor({ provider: "gemini", ...cause, domain: "infrastructure" });

  it.each([
    ["network-offline", /internet/i],
    ["invalid-api-key", /api key/i],
    ["invalid-base-url", /api url/i],
  ] as const)("%s is surface-agnostic", (kind, titlePattern) => {
    const a = infra({ kind, surface: "translate" });
    const b = infra({ kind, surface: "tts" });

    expect(a).toEqual(b);
    expect(a.title).toMatch(titlePattern);
  });

  it("invalid-api-key names the provider and the preference to fix", () => {
    expect(infra({ kind: "invalid-api-key", surface: "translate", provider: "anthropic" })).toEqual({
      title: "Invalid Anthropic API key",
      message: 'Update "API Key" in extension preferences.',
    });
    expect(infra({ kind: "invalid-api-key", surface: "translate", provider: "openai" }).title).toBe(
      "Invalid OpenAI API key",
    );
  });

  // An OpenAI-compatible server is not the vendor that issued the key, so the
  // copy must not claim the key is "an OpenAI key".
  it("invalid-api-key stays vendor-neutral for openai-compatible servers", () => {
    expect(infra({ kind: "invalid-api-key", surface: "translate", provider: "openai-compatible" }).title).toBe(
      "API key rejected",
    );
  });

  it.each(PROVIDER_IDS)("invalid-base-url names the preference and never echoes the URL (%s)", (provider) => {
    const spec = infra({ kind: "invalid-base-url", surface: "translate", provider });

    expect(spec.message).toContain("API Server URL");
    expect(spec.message).toMatch(/localhost/i);
    expect(spec.message).toMatch(/credentials/i);
    expect(spec.message).not.toMatch(/https?:\/\//);
  });

  // The cause does not say whether the URL was empty or rejected, so the copy
  // must not claim the field is unset.
  it("invalid-base-url asks openai-compatible users for a valid server URL without claiming it is unset", () => {
    const { message } = infra({ kind: "invalid-base-url", surface: "translate", provider: "openai-compatible" });
    expect(message).toMatch(/OpenAI-compatible servers need a valid "API Server URL"/);
    expect(message).not.toMatch(/"API Server URL" set/);
  });

  it("provider-undetected sends the user to pick a provider", () => {
    expect(infra({ kind: "provider-undetected", surface: "translate", provider: "unknown" })).toEqual({
      title: "Choose a provider",
      message: "The API key format wasn't recognized. Pick a provider in extension preferences.",
    });
  });

  it("missing-model names the Translation Model preference", () => {
    expect(infra({ kind: "missing-model", surface: "translate", provider: "openai-compatible" })).toEqual({
      title: "Model required",
      message: 'OpenAI-compatible servers need "Translation Model" set in extension preferences.',
    });
  });

  it("model-not-found references the correct preference name per surface", () => {
    const t = infra({ kind: "model-not-found", surface: "translate", model: "X" });
    const tts = infra({ kind: "model-not-found", surface: "tts", model: "X" });

    expect(t.message).toContain("Translation Model");
    expect(tts.message).toContain("Text-to-Speech Model");
    expect(t.message).toContain("X");
    expect(tts.message).toContain("X");
  });

  // Against a custom endpoint a 404 is ambiguous, so the copy must not send the
  // user off to cycle through models when the base URL is what is wrong.
  it("model-not-found names both preferences when a custom endpoint is configured", () => {
    const t = infra({ kind: "model-not-found", surface: "translate", model: "X", endpointHost: "gw.corp:8443" });
    const tts = infra({ kind: "model-not-found", surface: "tts", model: "X", endpointHost: "gw.corp:8443" });

    expect(t.title).toMatch(/model or endpoint/i);
    expect(t.message).toMatch(/model .* or its endpoint/i);
    expect(t.message).toContain("API Server URL");
    expect(t.message).toContain("Translation Model");
    expect(t.message).toContain("gw.corp:8443");
    expect(tts.message).toContain("API Server URL");
    expect(tts.message).toContain("Text-to-Speech Model");
  });

  it("model-not-found keeps the single-preference copy on the default endpoint", () => {
    const t = infra({ kind: "model-not-found", surface: "translate", model: "X" });

    expect(t.title).not.toMatch(/endpoint/i);
    expect(t.message).not.toContain("API Server URL");
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

  it.each([
    ["gemini", "Gemini returned 503. Please try again."],
    ["anthropic", "Anthropic returned 503. Please try again."],
    ["openai", "OpenAI returned 503. Please try again."],
    ["openai-compatible", "The API server returned 503. Please try again."],
  ] as const)("request-failed names %s as the source of the status", (provider, message) => {
    expect(infra({ kind: "request-failed", surface: "translate", status: 503, provider }).message).toBe(message);
  });

  it("request-failed omits status when not present", () => {
    const t = infra({ kind: "request-failed", surface: "translate" });

    expect(t.message).not.toMatch(/\d{3}/);
  });

  it("request-failed never echoes the upstream body", () => {
    const t = infra({ kind: "request-failed", surface: "translate", status: 400, body: '{"error":"secret detail"}' });

    expect(t.message).not.toContain("secret detail");
  });

  it("empty-response title varies by surface", () => {
    const t = infra({ kind: "empty-response", surface: "translate" });
    const tts = infra({ kind: "empty-response", surface: "tts" });

    expect(t.title).toMatch(/empty/i);
    expect(tts.title).toMatch(/audio/i);
  });

  it("invalid-response is surface-agnostic and names the provider", () => {
    const a = infra({ kind: "invalid-response", surface: "translate", provider: "anthropic" });
    const b = infra({ kind: "invalid-response", surface: "tts", provider: "anthropic" });

    expect(a).toEqual(b);
    expect(a.title).toBe("Unexpected response from Anthropic");
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
