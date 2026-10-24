import { describe, expect, it } from "vitest";
import { crossPlatformShortcut } from "../shortcuts";

describe("crossPlatformShortcut", () => {
  it("maps cmd to ctrl and opt to alt on Windows", () => {
    expect(crossPlatformShortcut(["opt", "cmd"], "arrowUp")).toEqual({
      macOS: { modifiers: ["opt", "cmd"], key: "arrowUp" },
      Windows: { modifiers: ["alt", "ctrl"], key: "arrowUp" },
    });
  });

  it("keeps shift on both platforms", () => {
    expect(crossPlatformShortcut(["shift", "cmd"], "c")).toEqual({
      macOS: { modifiers: ["shift", "cmd"], key: "c" },
      Windows: { modifiers: ["shift", "ctrl"], key: "c" },
    });
  });
});
