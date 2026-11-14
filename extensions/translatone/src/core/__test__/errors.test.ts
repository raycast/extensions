import { describe, expect, test } from "bun:test";
import {
  AllProvidersFailedError,
  describeError,
  EmptyTextError,
  InvalidSettingsError,
  NoProviderConfiguredError,
  ProviderError,
  type ProviderErrorReason,
} from "../errors";

describe("ProviderError", () => {
  test("points invalid provider settings to preferences", () => {
    expect(describeError(new InvalidSettingsError("Custom Base URL is required."))).toEqual({
      title: "Check provider settings",
      message: "Custom Base URL is required.",
      fix: "open_preferences",
    });
  });
  test.each([
    ["rate_limited", true, "Groq: rate limit reached"],
    ["limit_reached", true, "Groq: free quota used up"],
    ["server", true, "Groq: provider is down"],
    ["network", true, "Groq: unreachable"],
    ["timeout", true, "Groq: timed out"],
    ["unauthorized", false, "Groq: invalid API key"],
    ["bad_response", false, "Groq: unexpected response"],
    ["model_unavailable", true, "Groq: model unavailable"],
    ["request_rejected", false, "Groq: request rejected"],
  ] satisfies [ProviderErrorReason, boolean, string][])(
    "%s is recoverable=%p with summary %p",
    (reason, recoverable, summary) => {
      const error = new ProviderError("groq", reason, "details");

      expect(error.recoverable).toBe(recoverable);
      expect(error.summary).toBe(summary);
    },
  );

  test("keeps HTTP details and the original cause", () => {
    const cause = new TypeError("fetch failed");

    const error = new ProviderError("gemini", "server", "Bad gateway", {
      status: 502,
      requestId: "req_9",
      cause,
    });

    expect(error).toMatchObject({
      name: "ProviderError",
      provider: "gemini",
      status: 502,
      requestId: "req_9",
      message: "Bad gateway",
    });
    expect(error.cause).toBe(cause);
  });
});

describe("describeError", () => {
  test.each([
    [
      "a missing provider",
      new NoProviderConfiguredError(),
      "No provider configured",
      "Open Manage Providers to add a provider and choose an enabled primary provider.",
    ],
    ["empty text", new EmptyTextError(), "Nothing to translate", "There is no text to translate."],
    [
      "exhausted providers",
      new AllProvidersFailedError([
        new ProviderError("groq", "rate_limited", "slow down"),
        new ProviderError("ollama", "network", "offline"),
      ]),
      "All providers failed",
      "Groq: rate limit reached · Ollama: unreachable",
    ],
    [
      "a provider error",
      new ProviderError("gemini", "unauthorized", "bad key"),
      "Translation failed",
      "Gemini: invalid API key",
    ],
    ["a generic error", new RangeError("out of range"), "Translation failed", "out of range"],
    ["a thrown string", "plain failure", "Translation failed", "plain failure"],
  ])("describes %s", (_label, error, title, message) => {
    expect(describeError(error)).toMatchObject({ title, message });
  });
});

describe("describeError fix", () => {
  test.each([
    ["a missing provider", new NoProviderConfiguredError(), "open_preferences"],
    ["an invalid key", new ProviderError("groq", "unauthorized", "bad key"), "open_preferences"],
    ["a retired model", new ProviderError("groq", "model_unavailable", "gone"), "open_preferences"],
    [
      "a rejected request",
      new ProviderError("groq", "request_rejected", "bad"),
      "open_preferences",
    ],
    ["a rate limit", new ProviderError("groq", "rate_limited", "slow"), "retry"],
    ["a timeout", new ProviderError("groq", "timeout", "slow"), "retry"],
    [
      "exhausted providers",
      new AllProvidersFailedError([new ProviderError("groq", "rate_limited", "slow")]),
      "retry",
    ],
    [
      "exhausted providers that are all misconfigured",
      new AllProvidersFailedError([new ProviderError("groq", "model_unavailable", "gone")]),
      "open_preferences",
    ],
    ["empty text", new EmptyTextError(), "none"],
    ["a generic error", new RangeError("out of range"), "retry"],
  ] as const)("suggests the fix for %s", (_label, error, fix) => {
    expect(describeError(error).fix).toBe(fix);
  });
});
