import { describe, expect, it } from "vitest";
import { buildResult } from "./result";

describe("buildResult", () => {
  it("derives availability from outcome by default", () => {
    expect(
      buildResult({
        action: "toggleMute",
        mechanism: "shortcut",
        outcome: "success",
        reasonCode: "shortcutDispatched",
      }).availability,
    ).toBe("available");
    expect(
      buildResult({
        action: "toggleMute",
        mechanism: "none",
        outcome: "unavailable",
        reasonCode: "discordNotRunning",
      }).availability,
    ).toBe("unavailable");
    expect(
      buildResult({
        action: "toggleMute",
        mechanism: "shortcut",
        outcome: "failed",
        reasonCode: "dispatchError",
      }).availability,
    ).toBe("degraded");
    expect(
      buildResult({
        action: "toggleMute",
        mechanism: "shortcut",
        outcome: "unknown",
        reasonCode: "dispatchAmbiguous",
      }).availability,
    ).toBe("unknown");
  });

  it("resolves the user-facing message from the catalog by reason code", () => {
    const result = buildResult({
      action: "toggleDeafen",
      mechanism: "shortcut",
      outcome: "success",
      reasonCode: "shortcutDispatched",
    });
    expect(result.message.toLowerCase()).toContain("deafen");
    expect(result.message.toLowerCase()).toContain("sent");
  });

  it("allows availability and message overrides", () => {
    const result = buildResult({
      action: "toggleMute",
      mechanism: "shortcut",
      outcome: "failed",
      reasonCode: "dispatchError",
      availability: "unavailable",
      message: "custom",
    });
    expect(result.availability).toBe("unavailable");
    expect(result.message).toBe("custom");
  });

  it("never reports success availability for a failed outcome unless explicitly overridden", () => {
    const result = buildResult({
      action: "toggleMute",
      mechanism: "shortcut",
      outcome: "failed",
      reasonCode: "dispatchError",
    });
    expect(result.availability).not.toBe("available");
  });
});
