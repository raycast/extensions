import { delimitUntrustedContent, truncatePreservingEnds } from "./conversation-lifecycle";

export const MAX_INPUT_CHARS = 20_000;
export const INPUT_TRUNCATION_MARKER = "… [middle removed; beginning and end kept] …";

export type TranslationDirection = "pt-en" | "en-pt" | "ambiguous";

export interface PreparedInput {
  text: string;
  truncated: boolean;
  originalLength: number;
}

export function prepareInput(text: string): PreparedInput {
  return truncatePreservingEnds(text.trim(), MAX_INPUT_CHARS, INPUT_TRUNCATION_MARKER);
}

export function buildUntrustedPrompt(instruction: string, text: string): string {
  return [instruction, "---", delimitUntrustedContent(text)].join("\n\n");
}

/** Heurística conservadora: só decide quando há sinais suficientes de um dos idiomas. */
export function inferTranslationDirection(text: string): { direction: TranslationDirection; confidence: number } {
  const words = text.toLocaleLowerCase("pt-BR").match(/[a-záéíóúãõçêôàü]+/gu) ?? [];
  if (words.length < 4) return { direction: "ambiguous", confidence: 0 };
  const portuguese = new Set(["não", "que", "para", "uma", "com", "ção", "você", "dos", "das", "esta"]);
  const english = new Set(["the", "and", "for", "with", "you", "this", "that", "from", "are", "not"]);
  const ptScore = words.filter((word) => portuguese.has(word) || /[ãõçáéíóú]/u.test(word)).length;
  const enScore = words.filter((word) => english.has(word)).length;
  if (ptScore === enScore || Math.max(ptScore, enScore) < 2) return { direction: "ambiguous", confidence: 0.5 };
  const direction = ptScore > enScore ? "pt-en" : "en-pt";
  const confidence = Math.min(0.99, Math.max(ptScore, enScore) / words.length + 0.5);
  return { direction, confidence };
}

export function resolveTranslationDirection(explicitLanguage: string, text: string): TranslationDirection | string {
  const explicit = explicitLanguage.trim();
  if (explicit !== "") return explicit;
  return inferTranslationDirection(text).direction;
}
