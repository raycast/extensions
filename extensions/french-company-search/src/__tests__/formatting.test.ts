/**
 * Tests pour les fonctions de formatage français
 */

import { formatRepresentativeName, toTitleCase, formatCityName } from "../lib/formatting";

describe("toTitleCase", () => {
  test("should capitalize first letter and lowercase rest", () => {
    expect(toTitleCase("JEAN")).toBe("Jean");
    expect(toTitleCase("marie")).toBe("Marie");
    expect(toTitleCase("PIERRE")).toBe("Pierre");
  });

  test("should handle edge cases", () => {
    expect(toTitleCase("")).toBe("");
    expect(toTitleCase("A")).toBe("A");
    expect(toTitleCase("a")).toBe("A");
  });

  test("should handle accented characters", () => {
    expect(toTitleCase("ANDRÉ")).toBe("André");
    expect(toTitleCase("FRANÇOIS")).toBe("François");
  });
});

describe("formatRepresentativeName", () => {
  test("should format single name correctly", () => {
    expect(formatRepresentativeName(["JEAN"], "DUPONT")).toBe("Jean DUPONT");
    expect(formatRepresentativeName(["MARIE"], "MARTIN")).toBe("Marie MARTIN");
  });

  test("should format multiple first names", () => {
    expect(formatRepresentativeName(["JEAN", "CLAUDE"], "VAN DAMME")).toBe("Jean Claude VAN DAMME");
    expect(formatRepresentativeName(["MARIE", "FRANÇOISE"], "DURAND")).toBe("Marie Françoise DURAND");
  });

  test("should handle single first name with compound last name", () => {
    expect(formatRepresentativeName(["PIERRE"], "DE LA FONTAINE")).toBe("Pierre DE LA FONTAINE");
    expect(formatRepresentativeName(["JEAN"], "VAN DER BERG")).toBe("Jean VAN DER BERG");
  });

  test("should handle empty or partial values", () => {
    expect(formatRepresentativeName([], "")).toBe("[[to be completed]]");
    expect(formatRepresentativeName(["JEAN"], "")).toBe("Jean");
    expect(formatRepresentativeName([], "DUPONT")).toBe("DUPONT");
  });

  test("should handle whitespace and trim correctly", () => {
    expect(formatRepresentativeName(["  JEAN  "], "  DUPONT  ")).toBe("Jean DUPONT");
    expect(formatRepresentativeName(["MARIE", "  FRANCE  "], "MARTIN")).toBe("Marie France MARTIN");
  });

  test("should filter out empty names", () => {
    expect(formatRepresentativeName(["JEAN", "", "CLAUDE"], "DUPONT")).toBe("Jean Claude DUPONT");
    expect(formatRepresentativeName(["", "MARIE", ""], "MARTIN")).toBe("Marie MARTIN");
  });

  test("should handle accented names correctly", () => {
    expect(formatRepresentativeName(["ANDRÉ", "FRANÇOIS"], "MÜLLER")).toBe("André François MÜLLER");
  });

  test("should handle hyphenated names", () => {
    expect(formatRepresentativeName(["JEAN-PIERRE"], "MARTIN-DUPONT")).toBe("Jean-pierre MARTIN-DUPONT");
  });
});

describe("formatCityName", () => {
  test("should format simple city names", () => {
    expect(formatCityName("PARIS")).toBe("Paris");
    expect(formatCityName("MARSEILLE")).toBe("Marseille");
    expect(formatCityName("LYON")).toBe("Lyon");
  });

  test("should handle composed city names with hyphens", () => {
    expect(formatCityName("AIX-EN-PROVENCE")).toBe("Aix-en-Provence");
    expect(formatCityName("BOULOGNE-SUR-MER")).toBe("Boulogne-sur-Mer");
    expect(formatCityName("SAINT-DENIS")).toBe("Saint-Denis");
  });

  test("should preserve particles correctly", () => {
    expect(formatCityName("BOURG-EN-BRESSE")).toBe("Bourg-en-Bresse");
    expect(formatCityName("VILLENAVE-D ORNON")).toBe("Villenave-D Ornon");
  });

  test("should handle cities with particles", () => {
    expect(formatCityName("SAINT ETIENNE")).toBe("Saint Etienne");
    expect(formatCityName("LA ROCHELLE")).toBe("la Rochelle");
    expect(formatCityName("LE HAVRE")).toBe("le Havre");
  });

  test("should handle edge cases", () => {
    expect(formatCityName("")).toBe("[[to be completed]]");
    expect(formatCityName("NICE")).toBe("Nice");
  });

  test("should handle complex composed names", () => {
    expect(formatCityName("CHALON-SUR-SAONE")).toBe("Chalon-sur-Saone");
    expect(formatCityName("ROMANS-SUR-ISERE")).toBe("Romans-sur-Isere");
  });
});
