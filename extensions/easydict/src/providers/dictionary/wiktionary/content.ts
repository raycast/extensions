/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { ContentEquivalent, DictionaryContent, DictionarySection } from "@/core/content/types";
import type { QueryInput } from "@/core/results/types";

import type {
  WiktionaryDefinitionEntry,
  WiktionaryHeadwordForms,
  WiktionaryPronunciation,
  WiktionarySense,
  WiktionaryTranslationGroup,
} from "./parse";

const maxGroups = 8;
const maxSenses = 6;
const maxDefinitions = 5;
/** Short glosses such as `house; building` are joined for the first row; long English definitions are not. */
const maxPrimaryLength = 60;

export interface WiktionaryLookup {
  definitions: WiktionaryDefinitionEntry[];
  translations: WiktionaryTranslationGroup[];
  pronunciation: WiktionaryPronunciation;
  forms: WiktionaryHeadwordForms[];
}

/** The list view appends the period, as for Linguee, eg. `adj.`. */
const partOfSpeechAbbreviations: Record<string, string> = {
  noun: "n",
  "proper noun": "prop n",
  verb: "v",
  adjective: "adj",
  adverb: "adv",
  pronoun: "pron",
  preposition: "prep",
  conjunction: "conj",
  interjection: "interj",
  determiner: "det",
  article: "art",
  numeral: "num",
  particle: "part",
  phrase: "phr",
};

function abbreviate(partOfSpeech = ""): string | undefined {
  const name = partOfSpeech.toLowerCase();
  return partOfSpeechAbbreviations[name] ?? (name || undefined);
}

function primaryText(texts: string[], separator: string): string {
  let text = texts[0] ?? "";
  for (const next of texts.slice(1, 3)) {
    if (text.length + separator.length + next.length > maxPrimaryLength) break;
    text += separator + next;
  }
  return text;
}

/** Lemma meanings come first; grammatical forms such as `imperative of huse` fold into one collapsed row. */
function senseEquivalents(senses: WiktionarySense[], partOfSpeech: string): ContentEquivalent[] {
  const abbreviation = abbreviate(partOfSpeech);
  const meanings = senses.filter((sense) => !sense.formOf).slice(0, maxSenses);
  const forms = senses.filter((sense) => sense.formOf);
  return [
    ...meanings.map(({ gloss, examples }) => ({
      text: gloss,
      partOfSpeech: abbreviation,
      prominent: true,
      frequency: "common" as const,
      firstExampleTranslation: examples[0]?.sentence,
      examples,
    })),
    ...forms.map(({ gloss }) => ({
      text: gloss,
      partOfSpeech: abbreviation,
      prominent: false,
      frequency: "special-forms" as const,
    })),
  ];
}

/** Bokmål and Nynorsk can share glosses. Keep the first occurrence of each gloss per part of speech. */
function uniqueDefinitions(definitions: WiktionaryDefinitionEntry[]): WiktionaryDefinitionEntry[] {
  const shown = new Set<string>();
  return definitions.flatMap(({ partOfSpeech, senses }) => {
    const uniqueSenses = senses.filter(({ gloss }) => !shown.has(`${partOfSpeech}\n${gloss}`));
    for (const { gloss } of uniqueSenses) shown.add(`${partOfSpeech}\n${gloss}`);
    return uniqueSenses.length ? [{ partOfSpeech, senses: uniqueSenses }] : [];
  });
}

/**
 * Translation tables are preferred when looking up an English word in another language;
 * otherwise the source-language definitions, whose glosses are written in English, are shown.
 */
export function buildWiktionaryContent(
  query: QueryInput,
  { definitions, translations, pronunciation, forms }: WiktionaryLookup,
): DictionaryContent {
  const sections: DictionarySection[] = [];
  const glossesAreTranslations = query.fromLanguage !== "en" && query.toLanguage === "en";
  const distinctDefinitions = uniqueDefinitions(definitions);
  const meanings = distinctDefinitions.flatMap(({ senses }) => senses.filter((sense) => !sense.formOf));

  if (translations.length) {
    sections.push({ kind: "translation", text: primaryText(translations[0].words, ", "), lemma: query.word });
  } else if (distinctDefinitions.length && glossesAreTranslations) {
    const glosses = (meanings.length ? meanings : distinctDefinitions[0].senses).map((sense) => sense.gloss);
    sections.push({ kind: "translation", text: primaryText([...new Set(glosses)], "; "), lemma: query.word });
  } else {
    const entries = distinctDefinitions.slice(0, maxGroups).flatMap(({ partOfSpeech, senses }) =>
      senses.slice(0, maxSenses).map(({ gloss, examples }) => ({
        kind: "structured" as const,
        meanings: [gloss],
        partOfSpeech: abbreviate(partOfSpeech),
        explanation: "English definition",
        examples,
      })),
    );
    if (entries.length) sections.push({ kind: "definitions", textLanguage: "en", entries });
  }
  if (!sections.length) return { kind: "dictionary", query, sections };

  // One row per part of speech; alternative conjugations such as `løbe` (løb / løbede) stay on the web page.
  const seen = new Set<string>();
  for (const { partOfSpeech, forms: headwordForms } of forms) {
    if (seen.has(partOfSpeech)) continue;
    seen.add(partOfSpeech);
    sections.push({
      kind: "form-set",
      forms: [{ label: partOfSpeech.toLowerCase(), value: query.word }, ...headwordForms],
    });
  }

  if (translations.length) {
    for (const { gloss, partOfSpeech, words } of translations.slice(0, maxGroups)) {
      const abbreviation = abbreviate(partOfSpeech);
      sections.push({
        kind: "equivalents",
        headword: {
          word: query.word,
          qualifier: gloss ? `(${gloss})` : undefined,
          partOfSpeech: partOfSpeech?.toLowerCase(),
        },
        entries: words.map((text) => ({ text, partOfSpeech: abbreviation, prominent: true, frequency: "common" })),
      });
    }
    // Source-language definitions with their examples, shown in each row's detail.
    const entries = definitions.flatMap(({ partOfSpeech, senses }) =>
      senses
        .filter((sense) => !sense.formOf)
        .map(({ gloss, examples }) => ({
          kind: "structured" as const,
          meanings: [gloss],
          partOfSpeech: abbreviate(partOfSpeech),
          examples,
        })),
    );
    if (entries.length)
      sections.push({ kind: "definitions", textLanguage: "en", entries: entries.slice(0, maxDefinitions) });
  } else if (glossesAreTranslations) {
    for (const { partOfSpeech, senses } of distinctDefinitions.slice(0, maxGroups)) {
      sections.push({
        kind: "equivalents",
        headword: { word: query.word, partOfSpeech: partOfSpeech.toLowerCase() },
        entries: senseEquivalents(senses, partOfSpeech),
      });
    }
  }

  return {
    kind: "dictionary",
    query: { ...query, isWord: true, phonetic: pronunciation.ipa, speechUrl: pronunciation.audioUrl },
    sections,
  };
}
