import { describe, expect, it } from "vitest";
import { canSafelyRestoreClipboard } from "../src/clipboard-safety";

describe("Clipboard restoration safety", () => {
  it("accepts representations Raycast can restore losslessly", () => {
    expect(canSafelyRestoreClipboard({ text: "reference" })).toBe(true);
    expect(canSafelyRestoreClipboard({ text: "" })).toBe(true);
    expect(canSafelyRestoreClipboard({ text: "reference", html: "<p>reference</p>" })).toBe(true);
    expect(canSafelyRestoreClipboard({ text: "reference", file: "/tmp/reference.png" })).toBe(true);
  });

  it("rejects combined file and HTML representations", () => {
    expect(
      canSafelyRestoreClipboard({ text: "reference", file: "/tmp/reference.png", html: "<p>reference</p>" }),
    ).toBe(false);
  });
});
