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
    "## Meaning Notes",
    ...result.localDefinitions.map((definition, index) => `${index + 1}. ${definition}`),
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
    "meaning_definitions",
    "english_definitions",
    "synonyms",
    "collocations",
    "tech_context",
  ];
  const values = [
    result.word,
    result.phonetics.map((item) => `${item.region} ${item.text ?? ""}`.trim()).join("; "),
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
