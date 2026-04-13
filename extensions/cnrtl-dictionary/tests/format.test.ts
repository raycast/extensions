import {
  formatDefinitionMarkdown,
  formatDefinitionPlainText,
  formatEtymologyMarkdown,
  formatSynonymItems,
  formatSynonymPlainText,
  formatMorphologyMarkdown,
  formatErrorMarkdown,
} from "../src/utils/format";
import type {
  DefinitionEntry,
  EtymologyEntry,
  MorphologyEntry,
  SynonymResult,
} from "../src/utils/types";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const sampleDefinition: DefinitionEntry = {
  word: "maison",
  partOfSpeech: "subst. fém.",
  variants: ["MAISON"],
  sections: [
    {
      label: "I",
      qualifier: "[En référence à la construction]",
      text: "Bâtiment construit pour servir d'habitation.",
      examples: [{ text: "Une maison de campagne." }, { text: "La maison familiale." }],
      subSections: [],
    },
    {
      label: "II",
      qualifier: "[En référence à la famille]",
      text: "Ensemble des personnes habitant sous le même toit.",
      examples: [],
      subSections: [
        {
          label: "a)",
          text: "Famille au sens strict.",
          examples: [{ text: "Toute la maison était réunie." }],
        },
      ],
    },
  ],
  rawText: "MAISON subst. fém. Bâtiment construit pour servir d'habitation.",
  url: "https://www.cnrtl.fr/definition/maison",
};

const sampleSynonymResult: SynonymResult = {
  word: "maison",
  groups: [
    {
      label: "Très proche",
      entries: [
        { word: "demeure", degree: 3, url: "https://www.cnrtl.fr/synonymie/demeure" },
        { word: "résidence", degree: 3, url: "https://www.cnrtl.fr/synonymie/r%C3%A9sidence" },
      ],
    },
    {
      label: "Proche",
      entries: [
        { word: "domicile", degree: 2, url: "https://www.cnrtl.fr/synonymie/domicile" },
      ],
    },
  ],
  url: "https://www.cnrtl.fr/synonymie/maison",
};

const sampleEtymology: EtymologyEntry = {
  period: "XIIe s.",
  origin: "latin mansio",
  content:
    "MAISON (XIIe s.) du latin mansio, mansionem, dérivé de manere «rester».",
  url: "https://www.cnrtl.fr/etymologie/maison",
};

const sampleMorphology: MorphologyEntry = {
  word: "aimer",
  category: "verbe du 1er groupe",
  forms: [
    { label: "1ère personne – Singulier", form: "j'aime" },
    { label: "2ème personne – Singulier", form: "tu aimes" },
    { label: "1ère personne – Pluriel", form: "nous aimons" },
  ],
  url: "https://www.cnrtl.fr/morphologie/aimer",
};

// ─── formatDefinitionMarkdown ─────────────────────────────────────────────────

describe("formatDefinitionMarkdown", () => {
  let md: string;

  beforeEach(() => {
    md = formatDefinitionMarkdown(sampleDefinition);
  });

  it("includes the word as a heading", () => {
    expect(md).toMatch(/# maison/i);
  });

  it("includes the part of speech in italics", () => {
    expect(md).toMatch(/\*subst\. fém\.\*/);
  });

  it("includes variant spellings", () => {
    expect(md).toMatch(/MAISON/);
  });

  it("includes section labels as ## headings", () => {
    expect(md).toMatch(/## I\./);
    expect(md).toMatch(/## II\./);
  });

  it("includes qualifiers in headings", () => {
    expect(md).toMatch(/construction/i);
  });

  it("includes section text", () => {
    expect(md).toMatch(/habitation/i);
  });

  it("formats examples as blockquotes", () => {
    expect(md).toMatch(/> \*.*campagne.*\*/);
  });

  it("formats sub-sections with bold labels", () => {
    expect(md).toMatch(/\*\*a\)\*\*/);
  });

  it("includes CNRTL link at the end", () => {
    expect(md).toMatch(/\[Consulter sur le CNRTL\]/);
    expect(md).toMatch(/cnrtl\.fr\/definition\/maison/);
  });

  it("handles an entry with no sections gracefully", () => {
    const empty: DefinitionEntry = {
      word: "test",
      sections: [],
      rawText: "Aucune définition.",
      url: "https://www.cnrtl.fr/definition/test",
    };
    const result = formatDefinitionMarkdown(empty);
    expect(result).toMatch(/test/);
    expect(result).toMatch(/Aucune définition/);
  });
});

// ─── formatDefinitionPlainText ────────────────────────────────────────────────

describe("formatDefinitionPlainText", () => {
  it("contains the word", () => {
    const text = formatDefinitionPlainText(sampleDefinition);
    expect(text).toMatch(/maison/i);
  });

  it("contains section labels", () => {
    const text = formatDefinitionPlainText(sampleDefinition);
    expect(text).toMatch(/I\./);
    expect(text).toMatch(/II\./);
  });

  it("contains example text", () => {
    const text = formatDefinitionPlainText(sampleDefinition);
    expect(text).toMatch(/campagne/);
  });

  it("does not contain markdown syntax", () => {
    const text = formatDefinitionPlainText(sampleDefinition);
    expect(text).not.toMatch(/#+\s/);
    expect(text).not.toMatch(/\*\*/);
  });
});

// ─── formatEtymologyMarkdown ──────────────────────────────────────────────────

describe("formatEtymologyMarkdown", () => {
  let md: string;

  beforeEach(() => {
    md = formatEtymologyMarkdown(sampleEtymology, "maison");
  });

  it("includes a heading with the word", () => {
    expect(md).toMatch(/Étymologie de \*maison\*/);
  });

  it("includes the period", () => {
    expect(md).toMatch(/XIIe s\./);
  });

  it("includes the origin language", () => {
    expect(md).toMatch(/latin/i);
  });

  it("includes the full etymological content", () => {
    expect(md).toMatch(/mansio/);
  });

  it("includes CNRTL link", () => {
    expect(md).toMatch(/cnrtl\.fr\/etymologie\/maison/);
  });

  it("handles entry without period or origin", () => {
    const bare: EtymologyEntry = {
      content: "Origine inconnue.",
      url: "https://www.cnrtl.fr/etymologie/x",
    };
    const result = formatEtymologyMarkdown(bare, "x");
    expect(result).toMatch(/x/);
    expect(result).toMatch(/Origine inconnue/);
  });
});

// ─── formatSynonymItems ───────────────────────────────────────────────────────

describe("formatSynonymItems", () => {
  it("returns one item per entry across all groups", () => {
    const items = formatSynonymItems(sampleSynonymResult);
    const totalEntries = sampleSynonymResult.groups.reduce(
      (sum, g) => sum + g.entries.length,
      0
    );
    expect(items.length).toBe(totalEntries);
  });

  it("each item has a word and URL", () => {
    const items = formatSynonymItems(sampleSynonymResult);
    for (const item of items) {
      expect(item.word.length).toBeGreaterThan(0);
      expect(item.url).toMatch(/cnrtl\.fr/);
    }
  });

  it("renders degree dots for degree-3 entries", () => {
    const items = formatSynonymItems(sampleSynonymResult);
    const degree3 = items.filter((i) => i.subtitle.includes("●●●"));
    expect(degree3.length).toBeGreaterThan(0);
  });

  it("handles empty groups", () => {
    const empty: SynonymResult = { word: "test", groups: [], url: "" };
    expect(formatSynonymItems(empty)).toEqual([]);
  });
});

// ─── formatSynonymPlainText ───────────────────────────────────────────────────

describe("formatSynonymPlainText", () => {
  it("returns comma-separated synonym words", () => {
    const text = formatSynonymPlainText(sampleSynonymResult);
    expect(text).toMatch(/demeure/);
    expect(text).toMatch(/résidence/);
    expect(text).toMatch(/domicile/);
    expect(text).toContain(",");
  });
});

// ─── formatMorphologyMarkdown ─────────────────────────────────────────────────

describe("formatMorphologyMarkdown", () => {
  let md: string;

  beforeEach(() => {
    md = formatMorphologyMarkdown(sampleMorphology);
  });

  it("includes a heading with the word", () => {
    expect(md).toMatch(/Morphologie de \*aimer\*/);
  });

  it("includes the category", () => {
    expect(md).toMatch(/verbe/i);
  });

  it("renders a markdown table", () => {
    expect(md).toMatch(/\| Forme \| Valeur \|/);
    expect(md).toMatch(/---/);
  });

  it("includes each form", () => {
    expect(md).toMatch(/j'aime/);
    expect(md).toMatch(/tu aimes/);
    expect(md).toMatch(/nous aimons/);
  });

  it("includes CNRTL link", () => {
    expect(md).toMatch(/cnrtl\.fr\/morphologie\/aimer/);
  });

  it("handles entry with no forms gracefully", () => {
    const noForms: MorphologyEntry = {
      word: "test",
      forms: [],
      url: "https://www.cnrtl.fr/morphologie/test",
    };
    const result = formatMorphologyMarkdown(noForms);
    expect(result).toMatch(/Aucune forme/i);
  });
});

// ─── formatErrorMarkdown ──────────────────────────────────────────────────────

describe("formatErrorMarkdown", () => {
  it("includes the word in the heading", () => {
    const md = formatErrorMarkdown("Mot introuvable.", "xyzzy", "https://cnrtl.fr");
    expect(md).toMatch(/xyzzy/);
  });

  it("includes the error message", () => {
    const md = formatErrorMarkdown("Mot introuvable.", "xyzzy", "https://cnrtl.fr");
    expect(md).toMatch(/Mot introuvable/);
  });

  it("includes a link to CNRTL", () => {
    const md = formatErrorMarkdown("Erreur.", "test", "https://cnrtl.fr/definition/test");
    expect(md).toMatch(/https:\/\/cnrtl\.fr\/definition\/test/);
  });
});
