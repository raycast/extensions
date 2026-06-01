import { describe, it, expect, vi } from "vitest";
import { geminiError } from "./geminiError";
import { runPronounceWithFallback } from "./pronounceFlow";
import { routeTtsError, SYSTEM_VOICE_FALLBACK_MESSAGE } from "./ttsErrorRouter";

const NEVER_ABORT = new AbortController().signal;

function routedAsTransient(title = "Pronunciation failed", message = "Try again.") {
  return () => ({ title, message, fallback: true });
}

function routedAsTerminal(title = "Pronunciation failed", message = "Bad key.") {
  return () => ({ title, message, fallback: false });
}

describe("runPronounceWithFallback", () => {
  it("returns primary success with cached flag when Gemini succeeds", async () => {
    const outcome = await runPronounceWithFallback({
      signal: NEVER_ABORT,
      attemptPrimary: vi.fn(async () => ({ cached: true })),
      attemptFallback: vi.fn(),
      routeError: routedAsTransient(),
    });
    expect(outcome).toEqual({ kind: "primary", cached: true });
  });

  // The regression: a transient Gemini failure that lets system-voice fallback recover
  // must NOT report "failed" — otherwise the component shows a failure toast even
  // though the user just heard a pronunciation through say(1).
  it("returns fallback-ok (NOT failed) when primary errors but fallback succeeds", async () => {
    const attemptFallback = vi.fn(async () => {});
    const outcome = await runPronounceWithFallback({
      signal: NEVER_ABORT,
      attemptPrimary: vi.fn(async () => {
        throw new Error("network-offline");
      }),
      attemptFallback,
      routeError: routedAsTransient("Pronunciation failed", "Using system voice for now."),
    });
    expect(outcome).toEqual({
      kind: "fallback-ok",
      message: "Using system voice for now.",
    });
    expect(attemptFallback).toHaveBeenCalledOnce();
  });

  it("returns failed when primary AND fallback both error", async () => {
    const outcome = await runPronounceWithFallback({
      signal: NEVER_ABORT,
      attemptPrimary: vi.fn(async () => {
        throw new Error("network-offline");
      }),
      attemptFallback: vi.fn(async () => {
        throw new Error("say failed");
      }),
      routeError: routedAsTransient("Pronunciation failed", "Try again."),
    });
    expect(outcome).toEqual({
      kind: "failed",
      title: "Pronunciation failed",
      message: "Try again.",
    });
  });

  it("failed after double TTS error uses failure copy, not the system-voice success line", async () => {
    const err = geminiError({ domain: "infrastructure", kind: "network-offline", surface: "tts" });
    const outcome = await runPronounceWithFallback({
      signal: NEVER_ABORT,
      attemptPrimary: vi.fn(async () => {
        throw err;
      }),
      attemptFallback: vi.fn(async () => {
        throw new Error("say failed");
      }),
      routeError: (e) => routeTtsError(e, "en"),
    });
    expect(outcome).toEqual({
      kind: "failed",
      title: "No internet connection",
      message: "Check your connection and try again.",
    });
    expect(outcome).not.toMatchObject({ message: SYSTEM_VOICE_FALLBACK_MESSAGE });
  });

  it("skips fallback when route says fallback=false (terminal errors like invalid-api-key)", async () => {
    const attemptFallback = vi.fn();
    const outcome = await runPronounceWithFallback({
      signal: NEVER_ABORT,
      attemptPrimary: vi.fn(async () => {
        throw new Error("invalid-api-key");
      }),
      attemptFallback,
      routeError: routedAsTerminal("API key invalid", "Open prefs."),
    });
    expect(outcome).toEqual({ kind: "failed", title: "API key invalid", message: "Open prefs." });
    expect(attemptFallback).not.toHaveBeenCalled();
  });

  it("skips fallback when attemptFallback is null (language has no system voice)", async () => {
    const outcome = await runPronounceWithFallback({
      signal: NEVER_ABORT,
      attemptPrimary: vi.fn(async () => {
        throw new Error("network-offline");
      }),
      attemptFallback: null,
      routeError: routedAsTransient("Pronunciation failed", "Try again."),
    });
    expect(outcome).toEqual({ kind: "failed", title: "Pronunciation failed", message: "Try again." });
  });

  // User-cancellation should NOT trigger a say(1) fallback — AbortError masquerades
  // as a generic Error and would otherwise route through routeError and play audio
  // the user explicitly stopped requesting.
  it("returns aborted when the signal fired during primary (no fallback, no failure)", async () => {
    const controller = new AbortController();
    const attemptFallback = vi.fn();
    const outcome = await runPronounceWithFallback({
      signal: controller.signal,
      attemptPrimary: vi.fn(async () => {
        controller.abort();
        throw new DOMException("Aborted", "AbortError");
      }),
      attemptFallback,
      routeError: routedAsTransient(),
    });
    expect(outcome).toEqual({ kind: "aborted" });
    expect(attemptFallback).not.toHaveBeenCalled();
  });
});
