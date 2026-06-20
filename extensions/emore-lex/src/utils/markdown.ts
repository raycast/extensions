import { WordResult } from "../types/word";

export function renderWordMarkdown(result: WordResult): string {
  const lines = [
    `# ${result.word}`,
    "",
    result.syllables ? `- 音节：${result.syllables}` : undefined,
    result.pronunciationHint ? `- 发音提示：${result.pronunciationHint}` : undefined,
    result.phonetics.length > 0
      ? `- 音标：${result.phonetics.map((phonetic) => `${phonetic.region} ${phonetic.text ?? ""}`.trim()).join(" / ")}`
      : undefined,
    "",
    "## 中文释义",
    ...result.chineseDefinitions.map((definition, index) => `${index + 1}. ${definition}`),
    "",
    "## 英文释义",
    ...result.definitions.map((definition) => `- ${definition.partOfSpeech}. ${definition.english}`),
    "",
    "## 例句",
    ...result.examples.map((example) => `- ${example.example ?? example.english}`),
  ].filter((line): line is string => line !== undefined);

  if (result.techEntry) {
    lines.push(
      "",
      "## 运维场景",
      `- ${result.techEntry.chinese}`,
      `- ${result.techEntry.explanation}`,
      "",
      "### 常见原因",
      ...(result.techEntry.commonCauses ?? []).map((cause) => `- ${cause}`),
      "",
      "### 常见解决方案",
      ...(result.techEntry.solutions ?? []).map((solution) => `- ${solution}`),
    );
  }

  return lines.join("\n");
}

export function renderWordCsv(result: WordResult): string {
  const columns = [
    "word",
    "phonetics",
    "chinese_definitions",
    "english_definitions",
    "synonyms",
    "collocations",
    "tech_context",
  ];
  const values = [
    result.word,
    result.phonetics.map((item) => `${item.region} ${item.text ?? ""}`.trim()).join("; "),
    result.chineseDefinitions.join("; "),
    result.definitions.map((item) => `${item.partOfSpeech}. ${item.english}`).join("; "),
    result.synonyms.join("; "),
    result.collocations.join("; "),
    result.techEntry?.chinese ?? "",
  ];

  return `${columns.join(",")}\n${values.map(escapeCsvValue).join(",")}`;
}

function escapeCsvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
