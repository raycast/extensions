import { WordResult } from "../types/word";

export function renderWordMarkdown(result: WordResult): string {
  const lines = [
    `# ${result.word}`,
    "",
    result.syllables ? `- Syllables: ${result.syllables}` : undefined,
    result.pronunciationHint ? `- Pronunciation Hint: ${result.pronunciationHint}` : undefined,
    result.phonetics.length > 0
      ? `- Phonetics: ${result.phonetics.map((phonetic) => `${phonetic.region} ${phonetic.text ?? ""}`.trim()).join(" / ")}`
      : undefined,
    "",
    "## Chinese Meanings",
    ...renderChineseMeanings(result),
    "",
    ...renderMeaningNotes(result),
    "",
    "## English Definitions",
    ...result.definitions.map((definition) => `- ${definition.partOfSpeech}. ${definition.english}`),
    "",
    "## Examples",
    ...result.examples.map((example) => `- ${example.example ?? example.english}`),
  ].filter((line): line is string => line !== undefined);

  if (result.techEntry) {
    lines.push(
      "",
      "## Operations Context",
      `- ${result.techEntry.meaning}`,
      `- ${result.techEntry.explanation}`,
      "",
      "### Common Causes",
      ...(result.techEntry.commonCauses ?? []).map((cause) => `- ${cause}`),
      "",
      "### Common Fixes",
      ...(result.techEntry.solutions ?? []).map((solution) => `- ${solution}`),
    );
  }

  return lines.join("\n");
}

export function renderWordCsv(result: WordResult): string {
  const columns = [
    "word",
    "phonetics",
    "chinese_meanings",
    "meaning_notes",
    "english_definitions",
    "synonyms",
    "collocations",
    "tech_context",
  ];
  const values = [
    result.word,
    result.phonetics.map((item) => `${item.region} ${item.text ?? ""}`.trim()).join("; "),
    unique(result.definitions.map((item) => item.chinese).filter(isString)).join("; "),
    result.localDefinitions.join("; "),
    result.definitions.map((item) => `${item.partOfSpeech}. ${item.english}`).join("; "),
    result.synonyms.join("; "),
    result.collocations.join("; "),
    result.techEntry?.meaning ?? "",
  ];

  return `${columns.join(",")}\n${values.map(escapeCsvValue).join(",")}`;
}

function escapeCsvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function renderChineseMeanings(result: WordResult): string[] {
  const translatedDefinitions = unique(result.definitions.map((definition) => definition.chinese).filter(isString));
  if (translatedDefinitions.length === 0) return ["- No Chinese translation found."];

  return translatedDefinitions.map((definition) => `- ${definition}`);
}

function renderMeaningNotes(result: WordResult): string[] {
  if (result.localDefinitions.length === 0) return [];

  return [
    "## Operations / Local Notes",
    ...result.localDefinitions.map((definition, index) => `${index + 1}. ${definition}`),
  ];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}
