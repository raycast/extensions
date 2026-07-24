import { Definition, Meaning, WordEntry } from "../api/rae";
import { renderMeanings, renderWordMarkdown, renderWordTags } from "./markdown";

function newTestSense(overrides: Partial<Definition> = {}): Definition {
  return {
    raw: "1. f. Edificio para habitar.",
    meaning_number: 1,
    category: "noun",
    gender: "feminine",
    usage: "",
    description: "Edificio para habitar",
    synonyms: null,
    antonyms: null,
    ...overrides,
  };
}

function newTestMeaning(overrides: Partial<Meaning> = {}): Meaning {
  return {
    senses: [newTestSense()],
    ...overrides,
  };
}

function newTestWordEntry(overrides: Partial<WordEntry> = {}): WordEntry {
  return {
    word: "casa",
    meanings: [newTestMeaning()],
    suggestions: [],
    ...overrides,
  };
}

describe("renderMeanings", () => {
  describe("gender", () => {
    type testCase = {
      name: string;
      gender: string;
      expected: string;
    };

    const testCases: testCase[] = [
      { name: "feminine noun renders f.", gender: "feminine", expected: "*sust. f.*" },
      { name: "masculine noun renders m.", gender: "masculine", expected: "*sust. m.*" },
      { name: "dual gender noun renders m. y f.", gender: "masculine_and_feminine", expected: "*sust. m. y f.*" },
    ];

    testCases.forEach((tc) => {
      it(tc.name, () => {
        const entry = newTestWordEntry({
          meanings: [newTestMeaning({ senses: [newTestSense({ gender: tc.gender })] })],
        });

        const md = renderMeanings(entry);

        expect(md).toContain(tc.expected);
      });
    });
  });

  it("renders verb category abbreviation", () => {
    const entry = newTestWordEntry({
      meanings: [
        newTestMeaning({
          senses: [
            newTestSense({ category: "verb", verb_category: "transitive", gender: undefined, description: "Mover" }),
          ],
        }),
      ],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("*verbo tr.*");
  });

  it("renders usage label with RAE abbreviation", () => {
    const entry = newTestWordEntry({
      meanings: [newTestMeaning({ senses: [newTestSense({ usage: "colloquial" })] })],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("coloq.");
  });

  it("renders regions and fields as marks", () => {
    const entry = newTestWordEntry({
      meanings: [
        newTestMeaning({
          senses: [newTestSense({ regions: [{ code: "ES", name: "España" }], fields: ["Marina"] })],
        }),
      ],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("(España)");
    expect(md).toContain("(Marina)");
  });

  it("renders examples in italics after the description", () => {
    const entry = newTestWordEntry({
      meanings: [newTestMeaning({ senses: [newTestSense({ examples: ["Una casa de ocho plantas."] })] })],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("Edificio para habitar. *Una casa de ocho plantas.*");
  });

  it("renders usage notes after the description", () => {
    const entry = newTestWordEntry({
      meanings: [newTestMeaning({ senses: [newTestSense({ usage_notes: ["U. t. c. s."] })] })],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("Edificio para habitar. U. t. c. s.");
  });

  it("escapes markdown metacharacters in API-provided text", () => {
    const entry = newTestWordEntry({
      meanings: [
        newTestMeaning({
          senses: [
            newTestSense({
              description: "Uso de *asteriscos* y _guiones",
              examples: ["Una [casa] con `código`."],
              cross_references: ["ir_a"],
            }),
          ],
        }),
      ],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("Uso de \\*asteriscos\\* y \\_guiones");
    expect(md).toContain("*Una \\[casa\\] con \\`código\\`.*");
    expect(md).toContain("**ir\\_a**");
  });

  it("renders cross references", () => {
    const entry = newTestWordEntry({
      meanings: [newTestMeaning({ senses: [newTestSense({ cross_references: ["vivienda"] })] })],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("See: **vivienda**");
  });

  it("prefers synonyms_v2 over legacy synonyms", () => {
    const entry = newTestWordEntry({
      meanings: [
        newTestMeaning({
          senses: [newTestSense({ synonyms: ["legacy"], synonyms_v2: [{ word: "vivienda" }, { word: "hogar" }] })],
        }),
      ],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("_Synonyms_: vivienda, hogar");
    expect(md).not.toContain("legacy");
  });

  it("falls back to legacy synonyms and antonyms when v2 is missing", () => {
    const entry = newTestWordEntry({
      meanings: [newTestMeaning({ senses: [newTestSense({ synonyms: ["vivienda"], antonyms: ["intemperie"] })] })],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("_Synonyms_: vivienda");
    expect(md).toContain("_Antonyms_: intemperie");
  });

  it("renders locutions under an Expressions section", () => {
    const entry = newTestWordEntry({
      meanings: [
        newTestMeaning({
          locutions: [
            {
              expression: "echar la casa por la ventana",
              senses: [
                newTestSense({
                  category: "verb",
                  gender: undefined,
                  description: "Gastar con exceso",
                  usage: "colloquial",
                }),
              ],
            },
          ],
        }),
      ],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("### Expressions");
    expect(md).toContain("**echar la casa por la ventana**");
    expect(md).toContain("Gastar con exceso");
  });

  it("renders the origin from its raw form", () => {
    const entry = newTestWordEntry({
      meanings: [newTestMeaning({ origin: { raw: "Del lat. casa 'choza'.", type: "lat", voice: "", text: "casa" } })],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("**Origin:** Del lat. casa 'choza'.");
  });

  it("titles meanings with the word and homonym index when homonyms exist", () => {
    const entry = newTestWordEntry({
      meanings: [newTestMeaning({ homonym_index: 1 }), newTestMeaning({ homonym_index: 2 })],
    });

    const md = renderMeanings(entry);

    expect(md).toContain("## casa (1)");
    expect(md).toContain("## casa (2)");
    expect(md).not.toContain("## Meaning");
  });

  it("titles meanings generically when there are no homonyms", () => {
    const entry = newTestWordEntry();

    const md = renderMeanings(entry);

    expect(md).toContain("## Meaning 1");
  });
});

describe("renderWordMarkdown", () => {
  it("renders a full entry stably", () => {
    const entry = newTestWordEntry({
      meanings: [
        newTestMeaning({
          origin: { raw: "Del lat. casa 'choza'.", type: "lat", voice: "", text: "casa" },
          senses: [
            newTestSense({
              examples: ["Una casa de ocho plantas."],
              synonyms_v2: [{ word: "vivienda" }, { word: "hogar" }],
              regions: [{ code: "ES", name: "España" }],
            }),
            newTestSense({
              raw: "2. f. coloq. Familia.",
              meaning_number: 2,
              usage: "colloquial",
              description: "Familia",
            }),
          ],
          locutions: [
            {
              expression: "echar la casa por la ventana",
              senses: [newTestSense({ category: "verb", gender: undefined, description: "Gastar con exceso" })],
            },
          ],
        }),
      ],
    });

    const md = renderWordMarkdown(entry);

    expect(md).toMatchSnapshot();
  });
});

describe("renderWordTags", () => {
  it("returns unique category and gender tags across senses", () => {
    const entry = newTestWordEntry({
      meanings: [
        newTestMeaning({
          senses: [
            newTestSense(),
            newTestSense({ meaning_number: 2 }),
            newTestSense({ meaning_number: 3, category: "verb", gender: undefined }),
          ],
        }),
      ],
    });

    const tags = renderWordTags(entry);

    expect(tags).toEqual(["sust. f.", "verbo"]);
  });

  it("returns no tags for suggestion-only entries", () => {
    const entry = newTestWordEntry({ meanings: [] });

    const tags = renderWordTags(entry);

    expect(tags).toEqual([]);
  });
});
