import { describe, expect, it } from "vitest";
import { ENTITY_TYPES, matchScopePrefix, REGISTRY_ITEMS } from "./registry";

describe("matchScopePrefix", () => {
  it("restricts the query to the type of a known alias, case-insensitive", () => {
    const match = matchScopePrefix(ENTITY_TYPES, "rechnung: 2024");
    expect(match?.entityType.key).toBe("invoice");
    expect(match?.rest).toBe("2024");
  });

  it("accepts short aliases and an empty rest", () => {
    const match = matchScopePrefix(ENTITY_TYPES, "M:");
    expect(match?.entityType.key).toBe("member");
    expect(match?.rest).toBe("");
  });

  it("ignores unknown prefixes and text without a colon", () => {
    expect(matchScopePrefix(ENTITY_TYPES, "XYZ: anna")).toBeNull();
    expect(matchScopePrefix(ENTITY_TYPES, "anna")).toBeNull();
    expect(matchScopePrefix(ENTITY_TYPES, "anna müller: x")).toBeNull();
  });
});

describe("REGISTRY_ITEMS", () => {
  it("contains only items with a URL, no browser commands", () => {
    expect(REGISTRY_ITEMS.length).toBeGreaterThan(0);
    expect(REGISTRY_ITEMS.every((entry) => entry.kind === "url" && entry.url)).toBe(true);
  });
});
