import { describe, expect, it } from "vitest";

import { defaultToastFor } from "./errorToast";
import { geminiError } from "./geminiError";
import { routeTtsError } from "./ttsErrorRouter";

describe("routeTtsError — Gemini errors", () => {
  it("network-offline triggers fallback and keeps failure copy for when say also fails", () => {
    const err = geminiError({ domain: "infrastructure", kind: "network-offline", surface: "tts" });
    expect(routeTtsError(err, "en")).toMatchObject({
      message: defaultToastFor(err.cause).message,
      fallback: true,
    });
  });

  it.each([408, 429, 500, 503])("transient HTTP %d triggers fallback with default failure copy", (status) => {
    const err = geminiError({ domain: "infrastructure", kind: "request-failed", surface: "tts", status });
    const routed = routeTtsError(err, "en");
    expect(routed.fallback).toBe(true);
    expect(routed.message).toBe(defaultToastFor(err.cause).message);
  });

  it.each([400, 404])("non-transient request-failed HTTP %d does NOT fall back", (status) => {
    const err = geminiError({ domain: "infrastructure", kind: "request-failed", surface: "tts", status });
    expect(routeTtsError(err, "en").fallback).toBe(false);
  });

  it("invalid-api-key keeps the default copy and does not fall back", () => {
    const err = geminiError({ domain: "infrastructure", kind: "invalid-api-key", surface: "tts" });
    const routed = routeTtsError(err, "en");
    expect(routed.fallback).toBe(false);
    expect(routed.message).toBe(defaultToastFor(err.cause).message);
    expect(routed.title).toBe(defaultToastFor(err.cause).title);
  });

  it("model-not-found keeps the default copy and does not fall back", () => {
    const err = geminiError({ domain: "infrastructure", kind: "model-not-found", surface: "tts", model: "x" });
    expect(routeTtsError(err, "en").fallback).toBe(false);
  });
});

describe("routeTtsError — unknown errors", () => {
  it("falls back when the language has a macOS voice and surfaces the error message", () => {
    expect(routeTtsError(new Error("boom"), "en")).toMatchObject({
      title: "Pronunciation failed",
      message: "boom",
      fallback: true,
    });
  });

  it("does NOT fall back when the language has no macOS voice", () => {
    expect(routeTtsError(new Error("boom"), "xx").fallback).toBe(false);
  });

  it("coerces non-Error values to a plain Error and falls back when supported", () => {
    expect(routeTtsError("string thrown", "en")).toMatchObject({
      message: "string thrown",
      fallback: true,
    });
  });

  it("substitutes 'Unknown error.' for empty error messages", () => {
    expect(routeTtsError(new Error(""), "en").message).toBe("Unknown error.");
  });
});
