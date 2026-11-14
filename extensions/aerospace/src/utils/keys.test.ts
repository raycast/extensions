import { describe, expect, it } from "vitest";
import { normalizeKey, parseShortcutKey } from "./keys";

describe("Raycast shortcut display", () => {
  it("normalizes AeroSpace modifier and named key spellings", () => {
    expect(normalizeKey("alt")).toBe("opt");
    expect(normalizeKey("left")).toBe("arrowLeft");
    expect(normalizeKey("minus")).toBe("-");
  });

  it("turns a binding into a Raycast keyboard shortcut", () => {
    expect(parseShortcutKey("alt-shift-left")).toEqual({
      modifiers: ["opt", "shift"],
      key: "arrowLeft",
    });
  });

  it("does not register escape as an item shortcut", () => {
    expect(parseShortcutKey("alt-esc")).toBeNull();
  });

  it("does not register unsupported modifiers as Raycast shortcuts", () => {
    expect(parseShortcutKey("fn-a")).toBeNull();
  });
});
