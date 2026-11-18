import { ensureData } from "../data";
import { displayTitle, readBody, search, toPlainText } from "../dictionary";
import { CC_LICENSE_URL, GAFFIOT_CREDITS, GAFFIOT_SOURCE_URL } from "../legal";

/** Vedettes proches proposées quand le mot n'est pas une vedette exacte. */
const MAX_SUGGESTIONS = 10;

/** Attribution exigée par la clause de paternité, jointe à chaque réponse. */
const SOURCE = `${GAFFIOT_CREDITS.title}, ${GAFFIOT_CREDITS.edition}, ${GAFFIOT_CREDITS.copyright}. Authors: ${GAFFIOT_CREDITS.authors}. License: CC BY-NC-ND 4.0 (${CC_LICENSE_URL}). Latest version: ${GAFFIOT_SOURCE_URL}`;

type Input = {
  /**
   * Latin headword in its dictionary form: nominative singular for nouns and adjectives
   * (e.g. "rosa", "bonus"), first person singular present indicative for verbs (e.g. "amo", "habeo").
   * Vowel-length marks, case and the i/j, u/v spellings are ignored.
   * The dictionary does not lemmatize: inflected forms such as "amavit" or "rosarum" are not found.
   */
  word: string;
};

/**
 * Looks up a Latin word in the Gaffiot 2016 Latin-French dictionary (72,000 entries, offline).
 * Returns every entry whose headword matches exactly, homonyms included, with its complete French
 * definition: meanings, constructions, citations of Latin authors and references.
 * When there is no exact match, returns close headwords that can be looked up next.
 */
export default async function tool(input: Input) {
  await ensureData();
  const matches = search(input.word, MAX_SUGGESTIONS);
  const exact = matches.filter((m) => m.kind === "exact");

  if (exact.length > 0) {
    return {
      query: input.word,
      entries: exact.map(({ entry }) => ({
        headword: displayTitle(entry),
        // Article intégral, jamais abrégé (clause « pas de modification »)
        definition: toPlainText(readBody(entry)),
      })),
      source: SOURCE,
    };
  }

  return {
    query: input.word,
    entries: [],
    suggestions: [...new Set(matches.map(({ entry }) => entry.title))],
    source: SOURCE,
  };
}
