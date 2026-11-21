import { describe, expect, it } from "vitest";
import {
  actions,
  getAction,
  parseNativeResult,
  resultMessage,
} from "./actions";

describe("native control results", () => {
  it("requires an explicit acknowledgement before reporting success", () => {
    expect(parseNativeResult("ok\n")).toBe("ok");
    for (const output of [
      "",
      "true",
      "clicked",
      "ok\npermission",
      "error: ok",
    ]) {
      expect(() => parseNativeResult(output)).toThrow("did not confirm");
    }
  });

  it("keeps disabled, missing, and permission results actionable", () => {
    for (const result of [
      "permission",
      "disabled",
      "missing",
      "not-running",
    ] as const) {
      expect(parseNativeResult(result)).toBe(result);
      expect(resultMessage(result).length).toBeGreaterThan(30);
    }
    expect(resultMessage("disabled")).toContain("unavailable");
    expect(resultMessage("permission")).toContain("Accessibility");
  });

  it("accepts only known command actions", () => {
    expect(getAction("largest").item).toBe("Largest");
    expect(() => getAction("quit")).toThrow("Unknown");
  });

  it("does not expose file deletion or cache cleanup", () => {
    expect(
      actions.some((action) =>
        /trash|delete|remove|reclaim|uninstall/i.test(action.item),
      ),
    ).toBe(false);
    expect(new Set(actions.map((action) => action.id)).size).toBe(
      actions.length,
    );
  });
});
