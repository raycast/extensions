import { describe, expect, it } from "vitest";

import { defaultToastFor } from "./errorToast";
import { providerError } from "./providerError";
import { routeTtsError } from "./ttsErrorRouter";

describe("routeTtsError — provider errors", () => {
  it("network-offline triggers fallback with the neutral message", () => {
    const err = providerError({
      domain: "infrastructure",
      provider: "gemini",
      kind: "network-offline",
      surface: "tts",
    });
    expect(routeTtsError(err, "en")).toMatchObject({
      message: "Using system voice for now.",
      fallback: true,
    });
  });

  // The bug this test guards against: transient HTTP errors used to surface
  // defaultToastFor's "Please try again." copy inside a success toast — wrong
  // context. All transient kinds must rewrite the message.
  it.each([408, 429, 500, 503])(
    "transient HTTP %d triggers fallback with the neutral message (no retry-prompt leakage)",
    (status) => {
      const err = providerError({
        domain: "infrastructure",
        provider: "gemini",
        kind: "request-failed",
        surface: "tts",
        status,
      });
      const routed = routeTtsError(err, "en");
      expect(routed.fallback).toBe(true);
      expect(routed.message).toBe("Using system voice for now.");
    },
  );

  it.each([400, 404])("non-transient request-failed HTTP %d does NOT fall back", (status) => {
    const err = providerError({
      domain: "infrastructure",
      provider: "gemini",
      kind: "request-failed",
      surface: "tts",
      status,
    });
    expect(routeTtsError(err, "en").fallback).toBe(false);
  });

  // A misconfigured endpoint is reported honestly rather than masked by the
  // system voice — silently "succeeding" would hide the setting that is broken.
  it("invalid-base-url does not fall back to the system voice", () => {
    const err = providerError({
      domain: "infrastructure",
      provider: "gemini",
      kind: "invalid-base-url",
      surface: "tts",
    });
    const routed = routeTtsError(err, "en");

    expect(routed.fallback).toBe(false);
    expect(routed.title).toBe(defaultToastFor(err.cause).title);
  });

  it("invalid-api-key keeps the default copy and does not fall back", () => {
    const err = providerError({
      domain: "infrastructure",
      provider: "gemini",
      kind: "invalid-api-key",
      surface: "tts",
    });
    const routed = routeTtsError(err, "en");
    expect(routed.fallback).toBe(false);
    expect(routed.message).not.toBe("Using system voice for now.");
    expect(routed.title).toBe(defaultToastFor(err.cause).title);
  });

  it("model-not-found keeps the default copy and does not fall back", () => {
    const err = providerError({
      domain: "infrastructure",
      provider: "gemini",
      kind: "model-not-found",
      surface: "tts",
      model: "x",
    });
    expect(routeTtsError(err, "en").fallback).toBe(false);
  });
});

describe("routeTtsError — unknown errors", () => {
  it("falls back when the language has a macOS voice, with the same neutral copy as a transient provider error", () => {
    expect(routeTtsError(new Error("boom"), "en")).toMatchObject({
      title: "Pronunciation failed",
      message: "Using system voice for now.",
      fallback: true,
    });
  });

  it("does NOT fall back when the language has no macOS voice", () => {
    expect(routeTtsError(new Error("boom"), "xx").fallback).toBe(false);
  });

  // The leak this guards against: `say(1)` and afplay failures put the user's
  // absolute home path and the command line into error.message, which used to
  // be forwarded straight into the toast.
  it.each([
    new Error("spawn /Users/someone/Library/Caches/vocabuilder/tts-1.aiff ENOENT"),
    new Error("Command failed: /usr/bin/afplay '/Users/someone/Downloads/x.aiff'"),
    "string thrown",
    new Error(""),
  ])("never forwards raw failure text into the toast (%s)", (thrown) => {
    for (const languageCode of ["en", "xx"]) {
      const { message } = routeTtsError(thrown, languageCode);
      expect(message).not.toMatch(/\/Users\/|spawn |Command failed|string thrown/);
      expect(message).toBeTruthy();
    }
  });
});
