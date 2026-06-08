import { describe, expect, it } from "vitest";
import { buildResult } from "../../domain/result";
import { toDiagnosticEvent } from "./diagnostics";

describe("toDiagnosticEvent", () => {
  it("captures only the allowed sanitized fields", () => {
    const result = buildResult({
      action: "toggleMute",
      mechanism: "shortcut",
      outcome: "failed",
      reasonCode: "dispatchError",
      diagnostics: {
        detail: "osascript timed out",
        errorCategory: "shortcutNotEffective",
        durationMs: 42,
      },
    });
    const event = toDiagnosticEvent(result, new Date("2026-06-08T00:00:00.000Z"));

    expect(event).toEqual({
      timestamp: "2026-06-08T00:00:00.000Z",
      action: "toggleMute",
      mechanism: "shortcut",
      outcome: "failed",
      reasonCode: "dispatchError",
      detail: "osascript timed out",
      errorCategory: "shortcutNotEffective",
      durationMs: 42,
    });
  });

  it("does not include the user-facing message (no content leakage)", () => {
    const result = buildResult({
      action: "toggleMute",
      mechanism: "shortcut",
      outcome: "success",
      reasonCode: "shortcutDispatched",
    });
    const event = toDiagnosticEvent(result);
    expect(Object.keys(event)).not.toContain("message");
  });
});
