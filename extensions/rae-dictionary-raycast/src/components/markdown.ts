// src/components/markdown.ts
// Pure markdown builders for word entries. Kept free of Raycast imports so they
// can be unit-tested with jest (only .ts files are picked up by the test runner).
import {
  WordEntry,
  Meaning,
  Definition,
  Locution,
  Conjugation,
  Conjugations,
  ConjugationIndicative,
  ConjugationSubjunctive,
  ConjugationImperative,
  ConjugationNonPersonal,
} from "../api/rae";

// Abbreviations follow the ones used by the RAE dictionary itself,
// mirroring the mappings of the rae-api.com web client.
const CATEGORY_LABELS: Record<string, string> = {
  noun: "sust.",
  verb: "verbo",
  adjective: "adj.",
  adverb: "adv.",
  preposition: "prep.",
  conjunction: "conj.",
  interjection: "interj.",
  article: "art.",
  pronoun: "pron.",
};

const VERB_CATEGORY_LABELS: Record<string, string> = {
  transitive: "tr.",
  intransitive: "intr.",
  reflexive: "prnl.",
  pronominal: "prnl.",
  copulative: "copul.",
  defective: "def.",
  auxiliary: "aux.",
  predicative: "pred.",
};

const GENDER_LABELS: Record<string, string> = {
  masculine: "m.",
  feminine: "f.",
  masculine_and_feminine: "m. y f.",
};

const USAGE_LABELS: Record<string, string> = {
  colloquial: "coloq.",
  rare: "p. us.",
  outdated: "desus.",
  obsolete: "desus.",
  common: "",
};

// Escape Markdown metacharacters in API-provided text so dictionary content
// renders verbatim instead of altering the surrounding formatting.
function escapeMarkdown(text: string) {
  return text.replace(/([\\`*_[\]<>|~])/g, "\\$1");
}

function renderOrigin(meaning: Meaning) {
  if (!meaning.origin) return "";
  const text = meaning.origin.raw || meaning.origin.text;
  if (!text) return "";
  return `**Origin:** ${escapeMarkdown(text)}\n\n`;
}

function renderSenseMeta(sense: Definition) {
  const category = sense.category ? CATEGORY_LABELS[sense.category] || sense.category : "";
  const verbCategory = sense.verb_category ? VERB_CATEGORY_LABELS[sense.verb_category] || sense.verb_category : "";
  const gender = sense.gender ? GENDER_LABELS[sense.gender] || sense.gender : "";
  const usage = sense.usage ? (USAGE_LABELS[sense.usage] ?? sense.usage) : "";
  const marks = [...(sense.regions ?? []).map((region) => region.name), ...(sense.fields ?? [])];
  const meta = [category, verbCategory, gender, usage, ...marks.map((mark) => `(${escapeMarkdown(mark)})`)]
    .filter(Boolean)
    .join(" ");
  return meta ? `*${meta}*` : "";
}

function renderRelatedWords(label: string, words: RelatedWordsInput) {
  const names = words.v2?.length ? words.v2.map((related) => related.word) : (words.v1 ?? []);
  if (names.length === 0) return "";
  return `\n_${label}_: ${names.map(escapeMarkdown).join(", ")}`;
}

interface RelatedWordsInput {
  v1: string[] | null | undefined;
  v2: { word: string }[] | undefined;
}

function renderSense(sense: Definition) {
  const meta = renderSenseMeta(sense);
  const description = escapeMarkdown(sense.description || sense.raw);
  const examples = (sense.examples ?? []).map((example) => `*${escapeMarkdown(example)}*`).join(" ");
  const usageNotes = (sense.usage_notes ?? []).map(escapeMarkdown).join(" ");
  const crossReferences = (sense.cross_references ?? [])
    .map((reference) => `**${escapeMarkdown(reference)}**`)
    .join(", ");
  const synonyms = renderRelatedWords("Synonyms", { v1: sense.synonyms, v2: sense.synonyms_v2 });
  const antonyms = renderRelatedWords("Antonyms", { v1: sense.antonyms, v2: sense.antonyms_v2 });

  let line = `${sense.meaning_number}. ${meta ? meta + " " : ""}${description}.`;
  if (usageNotes) line += ` ${usageNotes}`;
  if (examples) line += ` ${examples}`;
  if (crossReferences) line += ` See: ${crossReferences}`;
  line += synonyms + antonyms;
  return line;
}

function renderDefinitions(senses: Definition[]) {
  return senses.map(renderSense).join("\n\n");
}

function renderLocutions(locutions?: Locution[]) {
  if (!locutions || locutions.length === 0) return "";
  let md = `### Expressions\n\n`;
  md += locutions
    .map((locution) => `**${escapeMarkdown(locution.expression)}**\n\n${renderDefinitions(locution.senses)}`)
    .join("\n\n");
  return md;
}

function renderNonPersonal(nonPersonal: ConjugationNonPersonal) {
  return (
    `### Non-personal forms\n` +
    `| Infinitive | Participle | Gerund | Compound infinitive | Compound gerund |\n` +
    `|---|---|---|---|---|\n` +
    `| ${nonPersonal.infinitive} | ${nonPersonal.participle} | ${nonPersonal.gerund} | ${nonPersonal.compound_infinitive} | ${nonPersonal.compound_gerund} |\n`
  );
}

function renderConjugationTable(conj: Conjugation) {
  return (
    `| I | You | You (formal) | He/She | We | You (plural) | You (plural formal) | They |\n` +
    `|---|---|---|---|---|---|---|---|\n` +
    `| ${conj.singular_first_person} | ${conj.singular_second_person} | ${conj.singular_formal_second_person} | ${conj.singular_third_person} | ${conj.plural_first_person} | ${conj.plural_second_person} | ${conj.plural_formal_second_person} | ${conj.plural_third_person} |\n`
  );
}

function renderIndicative(indicative: ConjugationIndicative) {
  let md = `### Indicative\n`;
  for (const [tense, conj] of Object.entries(indicative)) {
    if (!conj) continue;
    md += `**${formatTense(tense)}**\n\n`;
    md += renderConjugationTable(conj);
    md += `\n`;
  }
  return md;
}

function renderSubjunctive(subjunctive: ConjugationSubjunctive) {
  let md = `### Subjunctive\n`;
  for (const [tense, conj] of Object.entries(subjunctive)) {
    if (!conj) continue;
    md += `**${formatTense(tense)}**\n\n`;
    md += renderConjugationTable(conj);
    md += `\n`;
  }
  return md;
}

function renderImperative(imperative: ConjugationImperative) {
  return (
    `### Imperative\n` +
    `| You (singular) | You (formal) | You (plural) | You (plural formal) |\n` +
    `|---|---|---|---|\n` +
    `| ${imperative.singular_second_person} | ${imperative.singular_formal_second_person} | ${imperative.plural_second_person} | ${imperative.plural_formal_second_person} |\n`
  );
}

function renderConjugations(conjugations?: Conjugations) {
  if (!conjugations) return "";
  let md = "";
  if (conjugations.non_personal) md += renderNonPersonal(conjugations.non_personal) + "\n";
  if (conjugations.indicative) md += renderIndicative(conjugations.indicative) + "\n";
  if (conjugations.subjunctive) md += renderSubjunctive(conjugations.subjunctive) + "\n";
  if (conjugations.imperative) md += renderImperative(conjugations.imperative) + "\n";
  return md;
}

function formatTense(tense: string) {
  return tense.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function renderMeaningTitle(wordEntry: WordEntry, meaning: Meaning, idx: number) {
  const hasHomonyms = wordEntry.meanings.some((m) => (m.homonym_index ?? 0) > 0);
  if (hasHomonyms && meaning.homonym_index) {
    return `## ${escapeMarkdown(wordEntry.word)} (${meaning.homonym_index})\n`;
  }
  return `## Meaning ${idx + 1}\n`;
}

export function renderMeanings(wordEntry: WordEntry) {
  return wordEntry.meanings
    .map((meaning, idx) => {
      let md = renderMeaningTitle(wordEntry, meaning, idx);
      md += renderOrigin(meaning);
      md += renderDefinitions(meaning.senses);
      const locutions = renderLocutions(meaning.locutions);
      if (locutions) {
        md += "\n\n" + locutions;
      }
      if (meaning.conjugations) {
        md += "\n\n" + renderConjugations(meaning.conjugations);
      }
      return md;
    })
    .join("\n\n---\n\n");
}

export function renderWordMarkdown(wordEntry: WordEntry) {
  return `# ${escapeMarkdown(wordEntry.word)}\n\n${renderMeanings(wordEntry)}`;
}

export function renderWordTags(wordEntry: WordEntry) {
  const tags: string[] = [];
  for (const meaning of wordEntry.meanings) {
    for (const sense of meaning.senses) {
      const category = sense.category ? CATEGORY_LABELS[sense.category] || sense.category : "";
      const gender = sense.gender ? GENDER_LABELS[sense.gender] || sense.gender : "";
      const tag = [category, gender].filter(Boolean).join(" ");
      if (tag && !tags.includes(tag)) tags.push(tag);
    }
  }
  return tags;
}
