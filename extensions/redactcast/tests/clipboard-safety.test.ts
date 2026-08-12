import { describe, expect, it } from "vitest";
import { canSafelyRestoreClipboard, getRestorableClipboardContent } from "../src/clipboard-safety";

describe("Clipboard restoration safety", () => {
  it("returns the exact payload Raycast can restore", () => {
    expect(getRestorableClipboardContent({ text: "reference" })).toBe("reference");
    expect(getRestorableClipboardContent({ text: "" })).toBe("");
    expect(getRestorableClipboardContent({ text: "reference", html: "<p>reference</p>" })).toEqual({
      html: "<p>reference</p>",
      text: "reference",
    });
  });

  it("accepts representations Raycast can restore losslessly", () => {
    expect(canSafelyRestoreClipboard({ text: "reference" })).toBe(true);
    expect(canSafelyRestoreClipboard({ text: "" })).toBe(true);
    expect(canSafelyRestoreClipboard({ text: "reference", html: "<p>reference</p>" })).toBe(true);
  });

  it("rejects file-bearing representations", () => {
    expect(getRestorableClipboardContent({ text: "reference", file: "/tmp/reference.png" })).toBeNull();
    expect(canSafelyRestoreClipboard({ text: "reference", file: "/tmp/reference.png" })).toBe(false);
    expect(
      canSafelyRestoreClipboard({ text: "reference", file: "/tmp/reference.png", html: "<p>reference</p>" }),
    ).toBe(false);
  });
});
