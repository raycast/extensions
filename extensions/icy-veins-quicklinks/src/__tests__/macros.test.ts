import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseMacros, expandMacro } from "../utils/macros";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(),
}));

import { getPreferenceValues } from "@raycast/api";

const mockPrefs = (overrides: Partial<Record<string, string>> = {}) => {
  vi.mocked(getPreferenceValues).mockReturnValue({
    macro1: "",
    macro2: "",
    macro3: "",
    macro4: "",
    macro5: "",
    ...overrides,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseMacros()", () => {
  it("returns an empty map when all prefs are empty", () => {
    mockPrefs();
    expect(parseMacros().size).toBe(0);
  });

  it("parses a single valid macro", () => {
    mockPrefs({ macro1: "main=sp pve gear" });
    const macros = parseMacros();
    expect(macros.get("main")).toBe("sp pve gear");
  });

  it("parses multiple macros from different slots", () => {
    mockPrefs({
      macro1: "main=sp pve gear",
      macro3: "bis=bdk pve gear",
      macro5: "tank=prot pve guide",
    });
    const macros = parseMacros();
    expect(macros.size).toBe(3);
    expect(macros.get("main")).toBe("sp pve gear");
    expect(macros.get("bis")).toBe("bdk pve gear");
    expect(macros.get("tank")).toBe("prot pve guide");
  });

  it("ignores entries with no '=' character", () => {
    mockPrefs({ macro1: "mainspveagear" });
    expect(parseMacros().size).toBe(0);
  });

  it("ignores entries with empty key (starts with '=')", () => {
    mockPrefs({ macro1: "=sp pve gear" });
    expect(parseMacros().size).toBe(0);
  });

  it("ignores entries with empty value (ends with '=')", () => {
    mockPrefs({ macro1: "main=" });
    expect(parseMacros().size).toBe(0);
  });

  it("trims whitespace from keys and values", () => {
    mockPrefs({ macro1: "  main  =  sp pve gear  " });
    const macros = parseMacros();
    expect(macros.get("main")).toBe("sp pve gear");
  });

  it("stores keys in lowercase", () => {
    mockPrefs({ macro1: "MAIN=sp pve gear" });
    const macros = parseMacros();
    expect(macros.get("main")).toBe("sp pve gear");
    expect(macros.has("MAIN")).toBe(false);
  });

  it("handles values with '=' in them (only splits on the first '=')", () => {
    mockPrefs({ macro1: "eq=a=b" });
    const macros = parseMacros();
    expect(macros.get("eq")).toBe("a=b");
  });
});

describe("expandMacro()", () => {
  it("returns the expanded value when key matches", () => {
    const macros = new Map([["main", "sp pve gear"]]);
    expect(expandMacro("main", macros)).toBe("sp pve gear");
  });

  it("returns the original query when no match", () => {
    const macros = new Map([["main", "sp pve gear"]]);
    expect(expandMacro("sp pve", macros)).toBe("sp pve");
  });

  it("returns the original query when macros map is empty", () => {
    expect(expandMacro("main", new Map())).toBe("main");
  });

  it("matches keys case-insensitively", () => {
    const macros = new Map([["main", "sp pve gear"]]);
    expect(expandMacro("MAIN", macros)).toBe("sp pve gear");
    expect(expandMacro("Main", macros)).toBe("sp pve gear");
  });

  it("trims leading/trailing whitespace before matching", () => {
    const macros = new Map([["main", "sp pve gear"]]);
    expect(expandMacro("  main  ", macros)).toBe("sp pve gear");
  });

  it("handles expanded values with spaces correctly", () => {
    const macros = new Map([["arenas", "ww pvp comp"]]);
    expect(expandMacro("arenas", macros)).toBe("ww pvp comp");
  });
});
