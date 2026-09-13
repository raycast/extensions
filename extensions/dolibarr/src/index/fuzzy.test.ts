import { describe, expect, it } from "vitest";
import { normalize, scoreField, search, type FieldSpec } from "./fuzzy";

describe("normalize", () => {
  it("strips diacritics", () => {
    expect(normalize("Müller")).toBe("muller");
    expect(normalize("Bärlach")).toBe("barlach");
    expect(normalize("Öko-Institut")).toBe("oko-institut");
  });

  it("expands the sharp s", () => {
    expect(normalize("Straße")).toBe("strasse");
  });

  it("lowercases", () => {
    expect(normalize("GmbH")).toBe("gmbh");
  });
});

describe("scoreField", () => {
  it("returns null when a character is missing", () => {
    expect(scoreField("xyz", "Müller GmbH")).toBeNull();
  });

  it("returns null for an empty field", () => {
    expect(scoreField("a", null)).toBeNull();
    expect(scoreField("a", "")).toBeNull();
  });

  it("scores a contiguous match at a word start highest", () => {
    const direct = scoreField("muller", "Müller GmbH");
    const scattered = scoreField("muller", "Multi Layer Service");
    expect(direct).not.toBeNull();
    expect(scattered).not.toBeNull();
    expect(direct as number).toBeGreaterThan(scattered as number);
  });

  it("finds sequences with gaps", () => {
    expect(scoreField("mumi", "Müller-Mineral AG")).not.toBeNull();
  });

  it("prefers a whole word inside the name over a scattered match at the start", () => {
    // An anchor on the leading L of "LÖWEN" would never reach the real "Logistik".
    const wholeWord = scoreField("log", "Frachtmann Logistik GmbH");
    const scattered = scoreField("log", "LÖWENHOF Gastro GmbH");
    expect(wholeWord as number).toBeGreaterThan(scattered as number);
  });

  it("finds the word even when its first letter occurs earlier", () => {
    const late = scoreField("gmbh", "GILA GmbH");
    const scattered = scoreField("gmbh", "GIPA mbH");
    expect(late as number).toBeGreaterThan(scattered as number);
  });

  it("ignores case and diacritics", () => {
    expect(scoreField("muller", "MÜLLER GmbH")).not.toBeNull();
    expect(scoreField("MÜLLER", "Müller GmbH")).not.toBeNull();
  });

  it("finds the spelled-out umlaut form as used in email addresses", () => {
    // "müller" normalises to "muller", which is a subsequence of "mueller".
    expect(scoreField("MÜLLER", "info@mueller.example")).not.toBeNull();
  });
});

describe("search", () => {
  type Row = { name: string; email: string | null };
  const fields: FieldSpec<Row>[] = [
    { get: (r) => r.name, weight: 1 },
    { get: (r) => r.email, weight: 0.6 },
  ];
  const rows: Row[] = [
    { name: "Müller GmbH", email: "info@example.org" },
    { name: "Müller-Mineral AG", email: "kontakt@muellermineral.example" },
    { name: "Multi Layer Service", email: null },
    { name: "Kranich AG", email: "t.mueller@kranich.example" },
  ];

  it("ranks the direct name match above the scattered one", () => {
    const result = search(rows, fields, "muller");
    expect(result[0].name).toBe("Müller GmbH");
    const scatteredIndex = result.findIndex((r) => r.name === "Multi Layer Service");
    expect(scatteredIndex).toBeGreaterThan(0);
  });

  it("matches via email when the name does not", () => {
    expect(search(rows, fields, "kranich").map((r) => r.name)).toContain("Kranich AG");
  });

  it("requires every token to match", () => {
    const result = search(rows, fields, "muller gmbh");
    expect(result.map((r) => r.name)).toEqual(["Müller GmbH"]);
  });

  it("finds the abbreviation via a subsequence", () => {
    expect(search(rows, fields, "mumi").map((r) => r.name)).toContain("Müller-Mineral AG");
  });

  it("returns the leading slice for an empty query", () => {
    expect(search(rows, fields, "   ", 2)).toHaveLength(2);
  });

  it("caps the result count", () => {
    expect(search(rows, fields, "m", 2)).toHaveLength(2);
  });

  it("returns an empty list when nothing matches", () => {
    expect(search(rows, fields, "zzzz")).toEqual([]);
  });
});
