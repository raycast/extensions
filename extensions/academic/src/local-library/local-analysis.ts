import type { AnalysisInput, AnalysisOutput } from "./types";

export function localExtractiveAnalysis(input: AnalysisInput): AnalysisOutput {
  const text = cleanText(
    [input.abstract, input.text].filter(Boolean).join("\n"),
  );
  const words = tokenizeForLocalAnalysis(text);
  const frequencies = new Map<string, number>();
  for (const word of words)
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  const keywords = [...frequencies.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 14)
    .map(([word]) => word);
  const keywordSet = new Set(keywords);
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 40 && sentence.length <= 500);
  const ranked = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score:
        tokenizeForLocalAnalysis(sentence).reduce(
          (total, word) =>
            total + (keywordSet.has(word) ? (frequencies.get(word) ?? 0) : 0),
          0,
        ) / Math.max(1, tokenizeForLocalAnalysis(sentence).length),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .sort((left, right) => left.index - right.index)
    .map(({ sentence }) => sentence);
  return {
    summary:
      ranked.join(" ").slice(0, 1_600) ||
      input.abstract?.slice(0, 1_600) ||
      "Summary unavailable.",
    keyPoints: ranked.slice(0, 5),
    keywords,
    topics: keywords.slice(0, 8),
    methods: detectMethods(text),
  };
}

export function tokenizeForLocalAnalysis(value: string): string[] {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

function cleanText(value: string): string {
  return value.replace(/\0/g, " ").replace(/\s+/g, " ").trim();
}

function detectMethods(value: string): string[] {
  const methods = [
    "case study",
    "comparative analysis",
    "content analysis",
    "experiment",
    "literature review",
    "meta-analysis",
    "qualitative",
    "quantitative",
    "survey",
  ];
  const lower = value.toLowerCase();
  return methods.filter((method) => lower.includes(method));
}

const STOPWORDS = new Set([
  "about",
  "also",
  "among",
  "and",
  "are",
  "como",
  "com",
  "das",
  "dos",
  "from",
  "have",
  "into",
  "mais",
  "para",
  "pela",
  "pelo",
  "that",
  "the",
  "their",
  "this",
  "uma",
  "with",
  "were",
  "will",
]);
