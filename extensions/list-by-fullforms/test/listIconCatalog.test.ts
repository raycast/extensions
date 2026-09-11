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

  it("resolves a keyword rule with its own color", () => {
    // "code" → terminal/purple. Nothing longer competes in this name.
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

// Parity block mirroring the web's tests/listIconCatalog.test.js and the
// mobile app's test/list_icon_catalog_test.dart. All three assert the same
// cases on purpose: lists.icon / lists.color are shared keys, and a list
// created before the web started persisting its resolved appearance stores
// icon = null and is re-resolved independently on each client, so a divergence
// here renders the same list differently per platform. Change one, change all.
describe("keyword resolution parity with the web catalog", () => {
  // No rule targets the `list` key, so a "List" source means "no keyword match"
  // and the resolver fell through to the default glyph.
  const srcFor = (name: string) =>
    iconForList({ icon: null, color: null, name, id: 0 }).source;

  it("does not match terms mid-word", () => {
    expect(srcFor("Labels & Tags")).toBe("List"); // `lab`
    expect(srcFor("Collaboration Glossary")).toBe("List"); // `lab`
    expect(srcFor("Devotional Terms")).toBe("List"); // `dev`
    expect(srcFor("Latest Releases")).toBe("List"); // `test`
    expect(srcFor("Selfish Behaviour")).toBe("List"); // `fish`
    expect(srcFor("Facebook Ads")).toBe("List"); // `book`
    expect(srcFor("Catalog Numbers")).toBe("List"); // `cat`
    expect(srcFor("Taxonomy Basics")).toBe("List"); // `tax`
    expect(srcFor("Employee Training")).toBe("List"); // `train`
    expect(srcFor("Carbon Credits")).toBe("List"); // `car`
    expect(srcFor("Portfolio Theory")).toBe("List"); // `port`
    expect(srcFor("Digital Transition")).toBe("List"); // `transit`
  });

  it("still matches the short terms standing alone", () => {
    expect(srcFor("Lab Results")).toBe("MedicalSupport");
    expect(srcFor("Dev Tools")).toBe("Terminal");
    expect(srcFor("Pet Care")).toBe("Footprints");
    expect(srcFor("Train")).toBe("Train");
    expect(srcFor("Labor Law")).toBe("Building"); // `law` beats a stale `lab`
  });

  it("keeps stem inflections working", () => {
    expect(srcFor("Q3 Planning")).toBe("Clipboard");
    expect(srcFor("Computing Terms")).toBe("Terminal");
    expect(srcFor("Flowering Plants")).toBe("Leaf");
    expect(srcFor("Recipes")).toBe("MugSteam");
  });

  it("scores by specificity, not rule order", () => {
    // `plant` (leaf, 5) beats `plan` (clipboard, 4) despite clipboard being
    // the earlier rule — first-match-wins made this a clipboard.
    expect(srcFor("Plant Taxonomy")).toBe("Leaf");
    // Equal lengths still fall back to rule order: `plan` and `city` both 4.
    expect(srcFor("City Planning")).toBe("Clipboard");
  });

  it("resolves the subject, not the product's own domain nouns", () => {
    expect(srcFor("Fish Glossary")).toBe("Anchor");
    expect(srcFor("Medical Glossary")).toBe("MedicalSupport");
  });

  it("covers the widened domains", () => {
    expect(srcFor("Fish")).toBe("Anchor"); // no fish in the enum; marine stand-in
    expect(srcFor("Dog Breeds")).toBe("Footprints");
    expect(srcFor("Banking Terms")).toBe("BankNote");
    expect(srcFor("Legal Terms")).toBe("Building");
    expect(srcFor("Accounting Standards")).toBe("Calculator");
    expect(srcFor("Machine Learning")).toBe("MemoryChip");
    expect(srcFor("Kubernetes Terms")).toBe("Network");
    expect(srcFor("Security Terms")).toBe("Shield");
    expect(srcFor("Transport")).toBe("Car");
    expect(srcFor("Railway Terms")).toBe("Train");
    expect(srcFor("Freight Terms")).toBe("Lorry");
    expect(srcFor("Maritime Vocabulary")).toBe("Boat");
    expect(srcFor("Physics Terms")).toBe("Dna");
    expect(srcFor("Chemistry")).toBe("EyeDropper");
    expect(srcFor("Crypto Terms")).toBe("Crypto");
    expect(srcFor("Ham Radio")).toBe("Waveform");
    expect(srcFor("Fashion Terms")).toBe("Swatch");
    expect(srcFor("OAuth Scopes")).toBe("Key");
    expect(srcFor("Mobile Apps")).toBe("Mobile");
    expect(srcFor("Football Terms")).toBe("SoccerBall");
    expect(srcFor("School Subjects")).toBe("Pencil");
  });

  // Three near-collisions that resolve only because a longer, more specific
  // term out-scores a shorter one in a DIFFERENT rule.
  it("resolves the crypto / radio / atom near-collisions", () => {
    expect(srcFor("Cryptography")).toBe("Shield"); // cryptograph > crypto
    expect(srcFor("Radiology")).toBe("MedicalSupport"); // radiolog > radio
    expect(srcFor("Atomic Design")).toBe("Brush"); // atom is exact
  });

  it("renders the extended glyph keys the web can store", () => {
    // The gap this port closes: before it, any of these fell back to Icon.List.
    for (const [key, source] of [
      ["fish", "Anchor"],
      ["train-front", "Train"],
      ["banknote", "BankNote"],
      ["gem", "Crypto"],
      ["flask-conical", "EyeDropper"],
      ["radio-tower", "Waveform"],
      ["shirt", "Swatch"],
      ["atom", "Dna"],
    ] as const) {
      expect(
        iconForList({ icon: key, color: "blue", name: "x", id: 1 }).source,
      ).toBe(source);
    }
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
