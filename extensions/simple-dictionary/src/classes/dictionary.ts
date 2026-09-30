import { Cache } from "@raycast/api";

interface Sense {
  definition: string;
  tags: string[];
  examples: string[];
  quotes: {
    text: string;
    reference: string;
  }[];
  synonyms: string[];
  antonyms: string[];
  translations: string[];
  subsenses: Sense[];
  markdown?: string;
}

interface Entry {
  language: {
    code: string;
    name: string;
  };
  partOfSpeech: string;
  pronunciations: {
    type: string;
    text: string;
    tags: string[];
  }[];
  forms: {
    word: string;
    tags: string[];
  }[];
  senses: Sense[];
}

interface DictionaryResponse {
  word: string;
  entries: Entry[];
  source: {
    url: string;
    license: {
      name: string;
      url: string;
    };
  };
}

interface GroupedEntry {
  [partOfSpeech: string]: Entry;
}

class Dictionary {
  private static cache: Cache = new Cache();

  private url: string = "https://freedictionaryapi.com/api/v1/entries";
  private urlWord: string = "";

  private language: string = "";
  private word: string = "";

  private languageCode: string = "";
  private wordQuery: string = "";

  public get getURL(): string {
    return this.urlWord;
  }
  public get getLanguage(): string {
    return this.language;
  }

  constructor(languageCode: string, wordQuery: string) {
    this.languageCode = languageCode;
    this.wordQuery = wordQuery;
  }

  /**
   * Capitalizes the first letter of the input string and lowercases the rest.
   *
   * @param {string} text The input string to capitalize.
   * @returns {string} The capitalized string.
   */
  public static capitalize(text: string): string {
    return text.slice(0, 1).toUpperCase() + text.slice(1).toLowerCase();
  }

  public async getEntry(): Promise<GroupedEntry | undefined> {
    let result: GroupedEntry | undefined = {};

    try {
      const ge: GroupedEntry | undefined = this.checkCache();

      if (!ge || !Object.keys(ge).length) {
        result = await this.fetchEntry();
      } else {
        result = ge;
      }
    } catch (err) {
      console.error(err);
      result = await this.fetchEntry();
    }

    return result;
  }

  /**
   * Checks the cache for a previously fetched dictionary entry.
   *
   * @returns {GroupedEntry | undefined} The cached grouped entry if it exists. If there is no cached entry, it returns an empty object. If there is an error accessing the cache, it returns `undefined`.
   */
  private checkCache(): GroupedEntry | undefined {
    let result: GroupedEntry | undefined = {};

    try {
      const cachedResult: string | undefined = Dictionary.cache.get(`${this.languageCode}-${this.wordQuery}`);

      if (cachedResult) {
        const ge: GroupedEntry = JSON.parse(cachedResult);

        this.language = Dictionary.capitalize(ge[Object.keys(ge)?.[0]]?.language?.name || this.languageCode);
        this.word = ge[Object.keys(ge)?.[0]]?.forms[0]?.word || this.wordQuery;

        result = ge;
      } else {
        result = {};
      }
    } catch {
      result = undefined;
    }

    return result;
  }

  /**
   * Fetches a dictionary entry for the specified word and language from the configured URL.
   * If the fetch is successful, it processes and formats the entry, updating internal properties.
   *
   * @returns {Promise<GroupedEntry | undefined>} A promise that resolves to the grouped entry data or an empty object. If there are no definitions, it returns an empty object. If the fetch fails, it returns `undefined`.
   */
  private async fetchEntry(): Promise<GroupedEntry | undefined> {
    let result: GroupedEntry | undefined = {};

    try {
      const res: Response = await fetch(`${this.url}/${this.languageCode}/${this.wordQuery}`);

      if (res.ok) {
        const entry: DictionaryResponse = (await res.json()) as DictionaryResponse;

        if (entry.entries.length) {
          // Updating the word and language to ensure proper formatting

          this.language = Dictionary.capitalize(entry.entries[0]?.language?.name);
          this.word = entry.word;
          this.urlWord = entry.source.url.replaceAll(" ", "%20");

          const ge: GroupedEntry = this.groupEntries(entry);

          try {
            Dictionary.cache.set(`${this.languageCode}-${this.wordQuery}`, JSON.stringify(ge));
          } catch (error) {
            console.error("Failed to cache dictionary entry:", error);
          }

          result = ge;
        }
      } else {
        result = undefined;
      }
    } catch {
      result = undefined;
    }

    return result;
  }

  /**
   * Groups dictionary entries by their part of speech and enriches each sense with markdown content.
   *
   * Iterates through the provided dictionary response, organizing entries into a structure keyed by part of speech.
   * For each entry, it initializes the group if necessary, collects pronunciations and forms, and generates markdown
   * for each sense, including title, pronunciations, forms, and rendered sense details.
   *
   * @param {DictionaryResponse} entryThe dictionary response containing entries to be grouped.
   * @returns {GroupedEntry} An object mapping each part of speech to its grouped entries, including enriched senses.
   */
  private groupEntries(entry: DictionaryResponse): GroupedEntry {
    const groupedEntries: GroupedEntry = {};

    let title: string = "";
    let pronunciations: string = "";
    let forms: string = "";

    // Group senses by parts of speech

    entry.entries.forEach((e: Entry) => {
      if (!groupedEntries[e.partOfSpeech]) {
        // Initialize the part of speech entry

        groupedEntries[e.partOfSpeech] = {
          language: e.language,
          partOfSpeech: e.partOfSpeech,
          pronunciations: [],
          forms: [],
          senses: [],
        };

        // Parts of Speech

        title = `# ${this.word} (_${e.partOfSpeech}_)\n### Definition:\n`;

        // Pronunciations

        pronunciations = this.renderPronunciations(e);
        forms = this.renderForms(e);
      }

      groupedEntries[e.partOfSpeech].pronunciations.push(...e.pronunciations);
      groupedEntries[e.partOfSpeech].forms.push(...e.forms);
      e.senses.forEach((sense: Sense) => {
        const senseWithMarkdown = {
          ...sense,
          markdown: (title + this.renderSenses(sense) + pronunciations + forms).replaceAll("..", "."),
        };
        groupedEntries[e.partOfSpeech].senses.push(senseWithMarkdown);
      });
    });

    return groupedEntries;
  }

  /**
   * Renders the pronunciations of a dictionary entry as a Markdown table.
   * Groups pronunciations by region (tags) and phonetic system type.
   *
   * @param {Entry} entry The dictionary entry containing pronunciation data.
   * @returns {string} Markdown-formatted string representing the pronunciations table,
   * or an empty string if no pronunciations are available.
   */
  private renderPronunciations(entry: Entry): string {
    if (!entry.pronunciations || !entry.pronunciations.length) return "";

    let md = `### Pronunciations\n`;

    // Group pronunciations by region (tags) and type

    const grouped: Record<string, { type: string; text: string[] }> = {};
    entry.pronunciations.forEach((p) => {
      if (p.tags.length) {
        p.tags.forEach((tag: string) => {
          if (!grouped[tag]) grouped[tag] = { type: p.type, text: [] };
          grouped[tag].text.push(p.text);
        });
      } else {
        if (!grouped["-"]) grouped["-"] = { type: p.type, text: [] };
        grouped["-"].text.push(p.text);
      }
    });

    if (!Object.entries(grouped).length) return "";

    // Render table of pronunciations

    md += `| Dialect | Pronunciation | Phonetic System | \n|---|---|---|\n`;

    Object.entries(grouped).forEach(([region, group]) => {
      md += `| ${region} | ${group.text.join(", ")} | ${group.type} |\n`;
    });

    md += `\n\n`;

    return md;
  }

  /**
   * Renders the forms of a dictionary entry as a Markdown string.
   * For languages with complex conjugation systems, forms are grouped and displayed in tables by mood, tense, number, and person.
   * For other languages, forms are listed as bullet points.
   *
   * @param {Entry} entry The dictionary entry containing forms to render.
   * @returns {string} A Markdown-formatted string representing the forms of the entry.
   */
  private renderForms(entry: Entry): string {
    if (!entry.forms || !entry.forms.length) return "";

    let md = `### Forms\n`;

    const invalidTags: string[] = ["inflection-template", "table-tags", "class"];
    const complexConjugationsLanguages: string[] = [
      "ca",
      "cs",
      "fr",
      "de",
      "el",
      "hu",
      "it",
      "la",
      "pt",
      "ro",
      "ru",
      "sh",
      "es",
      "nl",
    ];
    const rows: string[] = [];

    // Languages with complex conjugation systems will have their forms grouped by mood, tense, number, and person in tables

    if (complexConjugationsLanguages.includes(this.languageCode)) {
      const nonfiniteMoods: string[] = ["gerund", "participle", "infinitive"];
      const moods: string[] = ["indicative", "subjunctive-i", "subjunctive-ii", "subjunctive", "imperative"];
      const tenses: string[] = [
        "future-i",
        "future-ii",
        "present",
        "imperfect",
        "preterite",
        "future",
        "conditional",
        "perfect",
        "pluperfect",
        "past perfect",
        "future perfect",
        "conditional perfect",
      ];
      const numbers: string[] = ["singular", "plural"];
      const persons: string[] = ["first-person", "second-person", "third-person"];

      const grouped: Record<
        string,
        Record<string, Record<string, Record<string, { word: string; tags: string[] }[]>>>
      > = {};

      entry.forms.forEach((f) => {
        // If the form has no tags, skip it

        if (!f.tags.length) return;

        // If the tags contain any invalid tags, skip this form

        if (f.tags.some((tag) => invalidTags.includes(tag))) return;

        // If the word contains any tense, number, or person keywords, skip this form

        for (const t of tenses) {
          if (f.word.includes(t.toLowerCase())) return;
        }

        for (const n of numbers) {
          if (f.word.includes(n.toLowerCase())) return;
        }

        for (const p of persons) {
          if (f.word.includes(p.toLowerCase())) return;
        }

        // Group the form by mood, tense, number, and person

        const mood: string =
          moods.find((m) => f.tags.includes(m)) ||
          (nonfiniteMoods.find((nm) => f.tags.includes(nm)) ? "non-finite" : "indicative");
        const tense: string = tenses.find((t) => f.tags.includes(t)) || "";
        const number: string = numbers.find((n) => f.tags.includes(n)) || "";
        const person: string = persons.find((p) => f.tags.includes(p)) || "";

        if (!grouped[mood]) grouped[mood] = {};
        if (!grouped[mood][tense]) grouped[mood][tense] = {};
        if (!grouped[mood][tense][number]) grouped[mood][tense][number] = {};
        if (!grouped[mood][tense][number][person]) grouped[mood][tense][number][person] = [];

        grouped[mood][tense][number][person].push(f);
      });

      Object.entries(grouped).forEach(([mood, tensesObj]) => {
        const nonFinite: boolean = mood === "non-finite";

        md += `#### ${nonFinite ? "Non-finite forms" : `Mood: ${mood}`}\n`;
        if (nonFinite) md += `| Name | Form |\n|---|---|\n`;

        Object.entries(tensesObj).forEach(([tense, numbersObj]) => {
          // Non-finite forms don't have tense, number, or person, so they are rendered in a single table

          if (nonFinite) {
            if (tense && mood !== "imperative") return;

            Object.entries(numbersObj).forEach(([, personsObj]) => {
              Object.entries(personsObj).forEach(([, formsArr]) => {
                formsArr.forEach((f) => {
                  const row: string = `| ${f.tags.join(", ")} | ${f.word} |\n`;

                  if (!rows.includes(row)) {
                    md += row;
                    rows.push(row);
                  }
                });
              });
            });

            rows.length = 0;
          } else {
            if (!tense && mood !== "imperative") return;

            md += `##### Tense: ${mood === "imperative" ? "present" : tense}\n`;
            md += `| Person & Number | Form |\n|---|---|\n`;

            Object.entries(numbersObj).forEach(([number, personsObj]) => {
              Object.entries(personsObj).forEach(([person, formsArr]) => {
                formsArr.forEach((f) => {
                  const row: string = `| ${person} ${number} | ${f.word} |\n`;

                  if (!rows.includes(row)) {
                    md += row;
                    rows.push(row);
                  }
                });
              });
            });

            rows.length = 0;
          }
        });

        md += `\n`;
      });
    } else {
      entry.forms.forEach((f) => {
        if (!f.tags.some((tag) => invalidTags.includes(tag))) {
          md += `- ${f.word} (${f.tags.join(", ")})\n`;
        }
      });
    }

    md += `\n\n`;

    return md;
  }

  /**
   * Renders a sense and its subsenses into a formatted Markdown string.
   *
   * This method takes a {@link Sense} object and recursively formats its definition,
   * examples, quotes, synonyms, antonyms, and any nested subsenses into a readable
   * Markdown structure. Subsenses are indented and numbered for clarity.
   *
   * @param sense The {@link Sense} object to render.
   * @returns {string} A Markdown-formatted string representing the sense and its subsenses.
   */
  private renderSenses(sense: Sense): string {
    if (!sense) return "";

    let md = "";

    const renderSubsenses = (subsenses: Sense[], indent: number = 1): string => {
      let subMd = "";
      const indentStr = "  ".repeat(indent);

      subsenses.forEach((s, idx, arr) => {
        subMd += `${indentStr}${idx + 1}. ${s.definition}\n`;
        if (s.synonyms && s.synonyms.length) subMd += `${indentStr}   - **Synonyms:** ${s.synonyms.join(", ")}\n`;
        if (s.antonyms && s.antonyms.length) subMd += `${indentStr}   - **Antonyms:** ${s.antonyms.join(", ")}\n`;
        if (s.examples && s.examples.length) {
          if (s.examples.length > 1)
            s.examples.forEach((ex: string, i: number) => {
              subMd += `${indentStr}   - **Example ${i + 1}:** "${ex}"\n`;
            });
          else subMd += `${indentStr}   - **Example:** "${s.examples[0]}"\n`;
        }
        if (s.quotes && s.quotes.length) {
          if (s.quotes.length > 1)
            s.quotes.forEach((q: { text: string; reference: string }, i: number) => {
              subMd += `${indentStr}   - **Quote ${i + 1}:** "${q.text}" - _${q.reference}_\n`;
            });
          else subMd += `${indentStr}   - **Quote:** "${s.quotes[0].text}" - _${s.quotes[0].reference}_\n`;
        }
        if (s.subsenses && s.subsenses.length) {
          subMd += renderSubsenses(s.subsenses, indent + 1);
        }
        if (idx + 1 === arr.length) subMd += "\n";
      });

      return subMd;
    };

    md += `${sense.definition}\n`;

    if (sense.examples && sense.examples.length) {
      if (sense.examples.length > 1)
        sense.examples.forEach((ex: string, i: number) => {
          md += `- **Example ${i + 1}:** "${ex}"\n`;
        });
      else md += `- **Example:** "${sense.examples[0]}"\n`;
    }
    if (sense.quotes && sense.quotes.length) {
      if (sense.quotes.length > 1)
        sense.quotes.forEach((q: { text: string; reference: string }, i: number) => {
          md += `- **Quote ${i + 1}:** "${q.text}" - _${q.reference}_\n`;
        });
      else md += `- **Quote:** "${sense.quotes[0].text}" - _${sense.quotes[0].reference}_\n`;
    }
    if (sense.synonyms && sense.synonyms.length) md += `- **Synonyms:** ${sense.synonyms.join(", ")}\n`;
    if (sense.antonyms && sense.antonyms.length) md += `- **Antonyms:** ${sense.antonyms.join(", ")}\n`;
    if (sense.subsenses && sense.subsenses.length) {
      md += renderSubsenses(sense.subsenses, 1);
    }

    md += "\n\n";

    return md;
  }
}

export default Dictionary;
export type { GroupedEntry, Sense };
