import { describe, expect, it } from "vitest";
import { clipboardRestoreContent, isRunInFlight, replaceFailureMessage } from "./replace";

describe("isRunInFlight", () => {
  const now = 1_000_000;
  const timeoutMs = 60_000;

  it("is false when nothing is recorded", () => {
    expect(isRunInFlight(undefined, now, timeoutMs)).toBe(false);
  });

  it("is false for a value that is not a timestamp", () => {
    expect(isRunInFlight("abc", now, timeoutMs)).toBe(false);
    expect(isRunInFlight("", now, timeoutMs)).toBe(false);
  });

  it("is true for a run started within the timeout", () => {
    expect(isRunInFlight(String(now - 5_000), now, timeoutMs)).toBe(true);
  });

  it("is false for a run older than the timeout", () => {
    expect(isRunInFlight(String(now - timeoutMs), now, timeoutMs)).toBe(false);
    expect(isRunInFlight(String(now - timeoutMs - 1), now, timeoutMs)).toBe(false);
  });

  it("is false for a timestamp in the future", () => {
    expect(isRunInFlight(String(now + 10_000), now, timeoutMs)).toBe(false);
  });
});

describe("replaceFailureMessage", () => {
  it("reports an empty answer", () => {
    expect(replaceFailureMessage({ ok: false, reason: "empty", text: "" })).toBe("The model returned no text");
  });

  it("quotes the first 80 characters of a refusal", () => {
    const refusal = `I'm sorry, but I can't help with that. ${"x".repeat(100)}`;
    expect(replaceFailureMessage({ ok: false, reason: "refusal", text: refusal })).toBe(
      `The model declined: ${refusal.slice(0, 80)}`,
    );
  });

  it("keeps a short refusal whole", () => {
    expect(replaceFailureMessage({ ok: false, reason: "refusal", text: "I can't assist with that." })).toBe(
      "The model declined: I can't assist with that.",
    );
  });
});

describe("clipboardRestoreContent", () => {
  it("restores a file first", () => {
    expect(clipboardRestoreContent({ text: "image.png", file: "/Users/me/image.png", html: "<b>x</b>" })).toEqual({
      file: "/Users/me/image.png",
    });
  });

  it("turns a file URL into a path", () => {
    expect(clipboardRestoreContent({ text: "", file: "file:///Users/me/My%20Image.png" })).toEqual({
      file: "/Users/me/My Image.png",
    });
  });

  it("restores html with its text", () => {
    expect(clipboardRestoreContent({ text: "bold", html: "<b>bold</b>" })).toEqual({
      html: "<b>bold</b>",
      text: "bold",
    });
  });

  it("restores plain text", () => {
    expect(clipboardRestoreContent({ text: "hello\n" })).toEqual({ text: "hello\n" });
  });

  it("returns undefined for an empty clipboard", () => {
    expect(clipboardRestoreContent({ text: "" })).toBeUndefined();
    expect(clipboardRestoreContent({ text: "", html: "", file: "" })).toBeUndefined();
  });
});
