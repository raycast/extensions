import { describe, it, expect } from "vitest";
import { SECTIONS } from "../sections";

const BRAND_TITLES = new Set([
  "P3",
  "Ípsilon",
  "Fugas",
  "Azul",
  "Ecosfera",
  "Ímpar",
]);

describe("section registry", () => {
  it("has 34 sections", () => {
    expect(SECTIONS).toHaveLength(34);
  });

  it("gives every section a non-empty title", () => {
    for (const section of SECTIONS) {
      expect(section.title.trim()).not.toBe("");
    }
  });

  it("gives every section at least one keyword", () => {
    for (const section of SECTIONS) {
      expect(section.keywords ?? []).not.toHaveLength(0);
    }
  });

  it("keeps every keyword lowercase", () => {
    for (const section of SECTIONS) {
      for (const keyword of section.keywords ?? []) {
        expect(keyword).toBe(keyword.toLowerCase());
      }
    }
  });

  it("keeps the Portuguese term as a keyword so it stays findable", () => {
    // Titles are English now, so the Portuguese name must live in keywords
    // or a Portuguese reader typing "desporto" finds nothing.
    const byslug = new Map(SECTIONS.map((s) => [s.slug, s]));
    const expectations: Array<[string, string]> = [
      ["desporto", "desporto"],
      ["saude", "saúde"],
      ["politica", "política"],
      ["educacao", "educação"],
      ["automoveis", "automóveis"],
    ];
    for (const [slug, term] of expectations) {
      expect(byslug.get(slug)?.keywords).toContain(term);
    }
  });

  it("leaves Público brand sections untranslated", () => {
    const titles = new Set(SECTIONS.map((s) => s.title));
    for (const brand of BRAND_TITLES) {
      expect(titles).toContain(brand);
    }
  });

  it("uses no Portuguese title outside the brand sections", () => {
    const stillPortuguese = SECTIONS.filter(
      (s) =>
        !BRAND_TITLES.has(s.title) &&
        [
          "Política",
          "Desporto",
          "Saúde",
          "Educação",
          "Automóveis",
          "Vídeos",
          "Ciência",
          "Economia",
          "Opinião",
          "Multimédia",
        ].includes(s.title),
    );
    expect(stillPortuguese).toEqual([]);
  });
});
