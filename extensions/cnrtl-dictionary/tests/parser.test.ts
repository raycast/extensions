import * as fs from "fs";
import * as path from "path";
import {
  cleanText,
  stripTags,
  isNotFoundPage,
  parseDefinitionPage,
  parseSynonymPage,
  parseEtymologyPage,
  parseMorphologyPage,
} from "../src/utils/parser";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function fixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
}

// ─── cleanText ────────────────────────────────────────────────────────────────

describe("cleanText", () => {
  it("trims leading and trailing whitespace", () => {
    expect(cleanText("  hello  ")).toBe("hello");
  });

  it("collapses multiple spaces into one", () => {
    expect(cleanText("hello   world")).toBe("hello world");
  });

  it("replaces non-breaking spaces with regular spaces", () => {
    expect(cleanText("hello\u00a0world")).toBe("hello world");
  });

  it("collapses mixed newlines and spaces", () => {
    expect(cleanText("foo\n  \n  bar")).toBe("foo bar");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(cleanText("   \n\t  ")).toBe("");
  });
});

// ─── stripTags ────────────────────────────────────────────────────────────────

describe("stripTags", () => {
  it("removes simple HTML tags", () => {
    expect(stripTags("<b>hello</b>")).toBe("hello");
  });

  it("removes nested tags", () => {
    expect(stripTags("<div><span>text</span></div>")).toBe("text");
  });

  it("handles self-closing tags", () => {
    expect(stripTags("line1<br/>line2")).toBe("line1 line2");
  });

  it("handles attributes", () => {
    expect(stripTags('<a href="http://example.com" class="foo">link</a>')).toBe("link");
  });

  it("leaves plain text unchanged", () => {
    expect(stripTags("no tags here")).toBe("no tags here");
  });
});

// ─── isNotFoundPage ───────────────────────────────────────────────────────────

describe("isNotFoundPage", () => {
  it("detects 'aucune entrée' in page", () => {
    const html = fixture("not-found.html");
    expect(isNotFoundPage(html)).toBe(true);
  });

  it("returns false for a valid definition page", () => {
    const html = fixture("definition.html");
    expect(isNotFoundPage(html)).toBe(false);
  });

  it("detects 'introuvable' in page", () => {
    expect(isNotFoundPage("<p>Mot introuvable dans le dictionnaire.</p>")).toBe(true);
  });

  it("detects 'not found' in page", () => {
    expect(isNotFoundPage("<p>Not found</p>")).toBe(true);
  });
});

// ─── parseDefinitionPage ──────────────────────────────────────────────────────

describe("parseDefinitionPage", () => {
  let entry: ReturnType<typeof parseDefinitionPage>;

  beforeEach(() => {
    entry = parseDefinitionPage(fixture("definition.html"), "maison");
  });

  it("extracts the headword", () => {
    expect(entry.word).toBe("MAISON");
  });

  it("extracts the part of speech", () => {
    expect(entry.partOfSpeech).toMatch(/subst/i);
  });

  it("extracts multiple definition sections", () => {
    expect(entry.sections.length).toBeGreaterThanOrEqual(2);
  });

  it("section labels are non-empty strings", () => {
    for (const section of entry.sections) {
      expect(typeof section.label).toBe("string");
      expect(section.label.length).toBeGreaterThan(0);
    }
  });

  it("section texts are non-empty", () => {
    for (const section of entry.sections) {
      expect(section.text.length).toBeGreaterThan(0);
    }
  });

  it("extracts qualifier/domain for sections", () => {
    const withQualifier = entry.sections.filter((s) => s.qualifier);
    expect(withQualifier.length).toBeGreaterThan(0);
  });

  it("extracts examples from sections", () => {
    const withExamples = entry.sections.filter((s) => s.examples.length > 0);
    expect(withExamples.length).toBeGreaterThan(0);
  });

  it("provides a valid URL", () => {
    expect(entry.url).toMatch(/cnrtl\.fr\/definition\/maison/);
  });

  it("provides rawText", () => {
    expect(entry.rawText.length).toBeGreaterThan(10);
  });

  it("does not include script content in sections", () => {
    const allText = entry.sections.map((s) => s.text).join(" ");
    expect(allText).not.toMatch(/var foo/);
  });

  it("handles a word not present in the page gracefully", () => {
    const emptyResult = parseDefinitionPage("<html><body></body></html>", "inconnu");
    expect(emptyResult.word).toBe("inconnu");
    expect(emptyResult.sections).toBeDefined();
  });
});

// ─── parseSynonymPage ─────────────────────────────────────────────────────────

describe("parseSynonymPage", () => {
  let result: ReturnType<typeof parseSynonymPage>;

  beforeEach(() => {
    result = parseSynonymPage(fixture("synonyms.html"), "maison", "synonymie");
  });

  it("returns the searched word", () => {
    expect(result.word).toBe("maison");
  });

  it("extracts synonym entries", () => {
    const all = result.groups.flatMap((g) => g.entries);
    expect(all.length).toBeGreaterThan(0);
  });

  it("extracts known synonyms", () => {
    const words = result.groups.flatMap((g) => g.entries.map((e) => e.word));
    expect(words).toContain("demeure");
    expect(words).toContain("résidence");
    expect(words).toContain("domicile");
  });

  it("extracts degree values (1–3)", () => {
    const all = result.groups.flatMap((g) => g.entries);
    const withDegree = all.filter((e) => e.degree !== undefined);
    expect(withDegree.length).toBeGreaterThan(0);
    for (const entry of withDegree) {
      expect([1, 2, 3]).toContain(entry.degree);
    }
  });

  it("extracts URLs for each synonym", () => {
    const all = result.groups.flatMap((g) => g.entries);
    for (const entry of all) {
      expect(entry.url).toMatch(/cnrtl\.fr/);
    }
  });

  it("provides the source URL", () => {
    expect(result.url).toMatch(/cnrtl\.fr\/synonymie\/maison/);
  });

  it("parses antonym page the same way", () => {
    const antonyms = parseSynonymPage(fixture("antonyms.html"), "vieux", "antonymie");
    const words = antonyms.groups.flatMap((g) => g.entries.map((e) => e.word));
    expect(words).toContain("jeune");
    expect(words).toContain("nouveau");
  });
});

// ─── parseEtymologyPage ───────────────────────────────────────────────────────

describe("parseEtymologyPage", () => {
  let entry: ReturnType<typeof parseEtymologyPage>;

  beforeEach(() => {
    entry = parseEtymologyPage(fixture("etymology.html"), "maison");
  });

  it("returns non-empty content", () => {
    expect(entry.content.length).toBeGreaterThan(20);
  });

  it("detects the historical period", () => {
    expect(entry.period).toBeDefined();
    expect(entry.period).toMatch(/XIIe/i);
  });

  it("detects the language of origin", () => {
    expect(entry.origin).toBeDefined();
    expect(entry.origin?.toLowerCase()).toMatch(/latin/);
  });

  it("provides a valid URL", () => {
    expect(entry.url).toMatch(/cnrtl\.fr\/etymologie\/maison/);
  });

  it("handles empty page gracefully", () => {
    const empty = parseEtymologyPage("<html><body></body></html>", "test");
    expect(empty.content).toBeDefined();
  });
});

// ─── parseMorphologyPage ──────────────────────────────────────────────────────

describe("parseMorphologyPage", () => {
  let entry: ReturnType<typeof parseMorphologyPage>;

  beforeEach(() => {
    entry = parseMorphologyPage(fixture("morphology.html"), "aimer");
  });

  it("returns the searched word", () => {
    expect(entry.word).toBe("aimer");
  });

  it("extracts morphological forms", () => {
    expect(entry.forms.length).toBeGreaterThan(0);
  });

  it("every form has a non-empty label and value", () => {
    for (const form of entry.forms) {
      expect(form.label.length).toBeGreaterThan(0);
      expect(form.form.length).toBeGreaterThan(0);
    }
  });

  it("detects the grammatical category", () => {
    expect(entry.category).toBeDefined();
    expect(entry.category?.toLowerCase()).toMatch(/verbe/);
  });

  it("extracts known conjugated forms", () => {
    const formValues = entry.forms.map((f) => f.form);
    const allForms = formValues.join(" ");
    // Present tense forms should be present
    expect(allForms).toMatch(/j'aime|j.aime/i);
  });

  it("provides a valid URL", () => {
    expect(entry.url).toMatch(/cnrtl\.fr\/morphologie\/aimer/);
  });

  it("handles empty page gracefully", () => {
    const empty = parseMorphologyPage("<html><body></body></html>", "test");
    expect(empty.word).toBe("test");
    expect(Array.isArray(empty.forms)).toBe(true);
  });
});
