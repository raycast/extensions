import { describe, expect, it } from "vitest";
import { parseShortcut } from "./shortcut-parser";

describe("parseShortcut", () => {
  it("parses a standard cmd+shift+m combo", () => {
    const result = parseShortcut("cmd+shift+m");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.shortcut.key).toBe("m");
      expect(result.shortcut.modifiers).toEqual(["command down", "shift down"]);
    }
  });

  it("is case-insensitive and tolerant of whitespace", () => {
    const result = parseShortcut("  CMD + Shift + D ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.shortcut.key).toBe("d");
      expect(result.shortcut.modifiers).toEqual(["command down", "shift down"]);
    }
  });

  it("orders modifiers canonically regardless of input order", () => {
    const result = parseShortcut("shift+option+ctrl+cmd+k");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.shortcut.modifiers).toEqual(["command down", "control down", "option down", "shift down"]);
    }
  });

  it("accepts modifier aliases", () => {
    expect(parseShortcut("command+option+m").ok).toBe(true);
    expect(parseShortcut("control+alt+m").ok).toBe(true);
  });

  it("rejects empty / nullish input", () => {
    expect(parseShortcut("").ok).toBe(false);
    expect(parseShortcut("   ").ok).toBe(false);
    expect(parseShortcut(undefined).ok).toBe(false);
    expect(parseShortcut(null).ok).toBe(false);
  });

  it("rejects a combo with no modifier (would not be safe to send blind)", () => {
    expect(parseShortcut("m").ok).toBe(false);
  });

  it("rejects a multi-character key", () => {
    expect(parseShortcut("cmd+shift+mm").ok).toBe(false);
  });

  it("rejects two key tokens", () => {
    expect(parseShortcut("cmd+m+n").ok).toBe(false);
  });

  it("rejects a combo with modifiers but no key", () => {
    expect(parseShortcut("cmd+shift").ok).toBe(false);
  });
});
