import { describe, expect, it } from "vitest";
import { filterItems, normalize, scoreItem, scoreToken, withinOneEdit } from "./fuzzyMatch";

describe("normalize", () => {
  it("lower-cases, transliterates umlauts and collapses whitespace", () => {
    expect(normalize("  Größe   Übersicht ")).toBe("groesse uebersicht");
  });

  it("strips accents", () => {
    expect(normalize("Café")).toBe("cafe");
  });

  it("treats a missing text as empty", () => {
    expect(normalize(undefined)).toBe("");
  });
});

describe("withinOneEdit", () => {
  it("accepts one substitution, insertion or deletion", () => {
    expect(withinOneEdit("termin", "termon")).toBe(true);
    expect(withinOneEdit("termin", "termine")).toBe(true);
    expect(withinOneEdit("termin", "termn")).toBe(true);
  });

  it("rejects two edits or a length difference above one", () => {
    expect(withinOneEdit("termin", "tarmon")).toBe(false);
    expect(withinOneEdit("ab", "abcd")).toBe(false);
    expect(withinOneEdit("mitglied", "mitgleid")).toBe(false);
  });
});

describe("scoreToken", () => {
  it("ranks exact over prefix over word prefix over substring over typo", () => {
    expect(scoreToken("mitglieder", "mitglieder")).toBe(100);
    expect(scoreToken("mit", "mitglieder")).toBe(80);
    expect(scoreToken("ver", "alle vereine")).toBe(60);
    expect(scoreToken("glied", "mitglieder")).toBe(40);
    expect(scoreToken("mitgleider", "mitglieder")).toBe(0);
    expect(scoreToken("termon", "termine")).toBe(20);
  });

  it("allows typos only from four characters on", () => {
    expect(scoreToken("tem", "termine")).toBe(0);
  });

  it("scores an empty text as no match", () => {
    expect(scoreToken("a", "")).toBe(0);
  });
});

describe("scoreItem", () => {
  const members = { label: "Mitglieder", keywords: ["members", "verwalten"] };

  it("weighs keyword matches at 70 percent", () => {
    expect(scoreItem("members", members)).toBe(70);
  });

  it("needs every token to match", () => {
    expect(scoreItem("mitglieder verwalten", members)).toBe(100 + 70);
    expect(scoreItem("mitglieder rechnung", members)).toBe(0);
  });

  it("returns 0 for an empty query", () => {
    expect(scoreItem("   ", members)).toBe(0);
  });

  it("matches umlauts typed as ae, oe, ue", () => {
    expect(scoreItem("uebersicht", { label: "Übersicht" })).toBe(100);
  });
});

describe("filterItems", () => {
  const items = [{ label: "Alle Vereine" }, { label: "Vereinsübersicht" }, { label: "Rechnungen" }];

  it("keeps matches only, best first, up to the limit", () => {
    expect(filterItems(items, "verein", 8).map((item) => item.label)).toEqual([
      "Vereinsübersicht",
      "Alle Vereine",
    ]);
    expect(filterItems(items, "verein", 1)).toHaveLength(1);
  });
});
