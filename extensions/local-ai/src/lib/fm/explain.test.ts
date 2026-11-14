import { describe, expect, it } from "vitest";
import { FmError, type FmErrorKind, tooLongMessage } from "./errors";
import { errorBlockMarkdown, explainFmError } from "./explain";

describe("explainFmError", () => {
  it("uses the exact too-long copy with token counts as the title", () => {
    const message = tooLongMessage(5000, 2900);
    expect(explainFmError(new FmError("contextOverflow", message)).title).toBe(
      "Text is too long for the on-device model (5000 tokens, limit 2900)",
    );
    expect(explainFmError(new FmError("contextOverflow", tooLongMessage())).title).toBe(
      "Text is too long for the on-device model",
    );
  });

  it("suggests a new chat only on the chat surface", () => {
    const error = new FmError("contextOverflow", tooLongMessage());
    const chat = explainFmError(error, { surface: "chat" }).explanation;
    expect(chat).toContain("4,096 tokens");
    expect(chat).toContain("new chat");
    const single = explainFmError(error, { surface: "single" }).explanation;
    expect(single).toContain("shorter text");
    expect(single).toContain("shorter answer");
    expect(single).not.toContain("new chat");
    expect(explainFmError(error).explanation).toBe(single);
  });

  it("keeps the timeout message with its seconds", () => {
    const message = "The on-device model did not finish within 60 seconds. Try shorter text.";
    expect(explainFmError(new FmError("timeout", message))).toEqual({ title: "Timed out", explanation: message });
  });

  it("explains the safety filter", () => {
    const { explanation } = explainFmError(new FmError("guardrail", "declined"));
    expect(explanation).toContain("safety filter");
    expect(explanation).toContain("Rephrasing");
  });

  it("reports a user stop", () => {
    expect(explainFmError(new FmError("aborted", "Cancelled"))).toEqual({
      title: "Stopped",
      explanation: "You stopped the answer.",
    });
  });

  it.each<FmErrorKind>(["notInstalled", "license", "unavailable"])("points %s to Check Setup", (kind) => {
    expect(explainFmError(new FmError(kind, "setup message"))).toEqual({
      title: "setup message",
      explanation: "Open Check Setup to fix this.",
    });
  });

  it("uses the existing message for an invalid model", () => {
    const result = explainFmError(new FmError("invalidModel", 'Model "x" is not available'));
    expect(result.title).toBe('Model "x" is not available');
    expect(result.explanation).toBe("The on-device model returned an error.");
  });

  it("appends the first stderr line for an invalid model", () => {
    const result = explainFmError(new FmError("invalidModel", "Bad model", "Error: 'pcc' is invalid\nmore"));
    expect(result.explanation).toBe("The on-device model returned an error. Error: 'pcc' is invalid");
  });

  it("appends the first stderr line for unknown errors", () => {
    expect(explainFmError(new FmError("unknown", "boom", "line one\nline two")).explanation).toBe(
      "The on-device model returned an error. line one",
    );
    expect(explainFmError(new FmError("unknown", "boom")).explanation).toBe("The on-device model returned an error.");
  });
});

describe("errorBlockMarkdown", () => {
  it("renders a blockquote with title and explanation", () => {
    expect(errorBlockMarkdown("Timed out", "Too slow.")).toBe("> **Stopped: Timed out**\n> Too slow.");
  });

  it("does not repeat Stopped and omits a missing explanation", () => {
    expect(errorBlockMarkdown("Stopped")).toBe("> **Stopped**");
  });
});
