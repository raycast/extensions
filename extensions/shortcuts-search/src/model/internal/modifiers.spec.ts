import { Modifiers, getModifierSymbols, modifierMapping, modifierTokens } from "./modifiers";

describe("Modifiers", () => {
  describe("getModifierSymbols", () => {
    it("returns macOS symbols for macOS platform", () => {
      const symbols = getModifierSymbols("macos");

      expect(symbols.get(Modifiers.command)).toBe("⌘");
      expect(symbols.get(Modifiers.control)).toBe("⌃");
      expect(symbols.get(Modifiers.option)).toBe("⌥");
      expect(symbols.get(Modifiers.shift)).toBe("⇧");
      expect(symbols.get(Modifiers.win)).toBe("Win");
    });

    it("returns Windows symbols for Windows platform", () => {
      const symbols = getModifierSymbols("windows");

      expect(symbols.get(Modifiers.command)).toBe("Cmd");
      expect(symbols.get(Modifiers.control)).toBe("Ctrl");
      expect(symbols.get(Modifiers.option)).toBe("Alt");
      expect(symbols.get(Modifiers.shift)).toBe("Shift");
      expect(symbols.get(Modifiers.win)).toBe("Win");
    });
  });

  describe("modifierMapping", () => {
    it("maps ctrl token to control modifier", () => {
      expect(modifierMapping.get("ctrl")).toBe(Modifiers.control);
    });

    it("maps shift token to shift modifier", () => {
      expect(modifierMapping.get("shift")).toBe(Modifiers.shift);
    });

    it("maps opt token to option modifier", () => {
      expect(modifierMapping.get("opt")).toBe(Modifiers.option);
    });

    it("maps alt token to option modifier", () => {
      expect(modifierMapping.get("alt")).toBe(Modifiers.option);
    });

    it("maps cmd token to command modifier", () => {
      expect(modifierMapping.get("cmd")).toBe(Modifiers.command);
    });

    it("maps win token to win modifier", () => {
      expect(modifierMapping.get("win")).toBe(Modifiers.win);
    });
  });

  describe("modifierTokens", () => {
    it("includes all modifier tokens including win", () => {
      expect(modifierTokens).toContain("ctrl");
      expect(modifierTokens).toContain("shift");
      expect(modifierTokens).toContain("opt");
      expect(modifierTokens).toContain("alt");
      expect(modifierTokens).toContain("cmd");
      expect(modifierTokens).toContain("win");
    });

    it("has correct length", () => {
      expect(modifierTokens).toHaveLength(6);
    });
  });

  describe("Modifiers enum", () => {
    it("has macOS JXA format values for macOS modifiers", () => {
      expect(Modifiers.command).toBe("command down");
      expect(Modifiers.control).toBe("control down");
      expect(Modifiers.option).toBe("option down");
      expect(Modifiers.shift).toBe("shift down");
    });

    it("includes win modifier", () => {
      expect(Modifiers.win).toBe("win down");
    });
  });
});
