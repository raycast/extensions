import { describe, it, expect } from "vitest";
import {
  iconForList,
  iconForWorkspace,
  listVisibility,
} from "../src/lib/listIconCatalog";

// Icon values come from the test stub (test/mocks/raycast-api.ts), where
// Icon.Foo === "Foo". Colors are the real hex strings from the catalog.

describe("iconForList", () => {
  it("uses the explicit icon + color when both are valid", () => {
    expect(iconForList({ icon: "book", color: "green", name: "x", id: 1 })).toEqual(
      { source: "Book", tintColor: "#10b981" },
    );
  });

  it("falls back to a keyword rule on the name when no icon/color is set", () => {
    // "project" is the first KEYWORD_RULE → clipboard glyph, blue tint.
    expect(
      iconForList({ icon: null, color: null, name: "Project Roadmap", id: 7 }),
    ).toEqual({ source: "Clipboard", tintColor: "#1d9bf0" });
  });

  it("honors keyword-rule ordering (first match wins)", () => {
    // "test" appears in the medical rule; a name matching an earlier rule
    // should still take the earlier rule. "code" → terminal/purple.
    expect(
      iconForList({ icon: null, color: null, name: "Code Notes", id: 1 }),
    ).toEqual({ source: "Terminal", tintColor: "#8b5cf6" });
  });

  it("falls back to a deterministic id-based color when no keyword matches", () => {
    // No keyword match → default "list" glyph + FALLBACK_PALETTE_KEYS[id % 7].
    // id 3 → index 3 → "amber" (#f59e0b).
    expect(
      iconForList({ icon: null, color: null, name: "Zqx Miscellany", id: 3 }),
    ).toEqual({ source: "List", tintColor: "#f59e0b" });
  });

  it("is deterministic: same id maps to the same fallback color", () => {
    const a = iconForList({ icon: null, color: null, name: "Nope", id: 10 });
    const b = iconForList({ icon: null, color: null, name: "Nope", id: 10 });
    expect(a).toEqual(b);
  });

  it("maps substitute glyphs (food has no cutlery icon → MugSteam)", () => {
    expect(
      iconForList({ icon: "food", color: "orange", name: "x", id: 1 }),
    ).toEqual({ source: "MugSteam", tintColor: "#fb923c" });
  });

  it("renders legacy render-only glyphs (sparkle → Stars)", () => {
    expect(
      iconForList({ icon: "sparkle", color: "pink", name: "x", id: 1 }),
    ).toEqual({ source: "Stars", tintColor: "#ec4899" });
  });

  it("falls back to Icon.List for an unknown glyph key", () => {
    const result = iconForList({
      icon: "not-a-real-glyph",
      color: "blue",
      name: "Zqx",
      id: 1,
    });
    // Unknown explicit icon isn't a valid glyph, so tier 1 fails and it
    // resolves via the id fallback path, landing on the default list glyph.
    expect(result.source).toBe("List");
  });
});

describe("listVisibility", () => {
  it("returns Public for a public list", () => {
    expect(listVisibility(true, "team")).toEqual({
      label: "Public",
      icon: "Globe",
    });
  });

  it("returns Shared for a private list in a team workspace", () => {
    expect(listVisibility(false, "team")).toEqual({
      label: "Shared",
      icon: "TwoPeople",
    });
  });

  it("returns Private for a private list in a personal workspace", () => {
    expect(listVisibility(false, "personal")).toEqual({
      label: "Private",
      icon: "Lock",
    });
  });
});

describe("iconForWorkspace", () => {
  it("uses the avatar as a circle-masked image when set", () => {
    expect(iconForWorkspace("https://x/y.png", "team")).toEqual({
      source: "https://x/y.png",
      mask: "circle",
    });
  });

  it("falls back to a single-person glyph for a personal workspace", () => {
    expect(iconForWorkspace(null, "personal")).toBe("Person");
  });

  it("falls back to a two-people glyph for a team workspace", () => {
    expect(iconForWorkspace(undefined, "team")).toBe("TwoPeople");
  });
});
