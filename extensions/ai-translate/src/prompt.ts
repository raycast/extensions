import { TranslationRequest } from "./types";

const styleInstructions: Record<TranslationRequest["style"], string> = {
  balanced: "Prefer natural, accurate wording with no unnecessary embellishment.",
  faithful: "Stay close to the source wording and preserve technical terms, names, numbers, and formatting.",
  polished: "Make the translation fluent and idiomatic while preserving the original meaning.",
  academic:
    "Use precise, formal academic prose while preserving concepts, citations, and legal or technical terminology.",
};

export function buildTranslationPrompt(request: TranslationRequest): { system: string; user: string } {
  const system = [
    "You are a professional translation engine.",
    "Translate complete sentences and paragraphs, not isolated dictionary entries.",
    "Return only the translation. Do not explain, annotate, quote the source, or wrap the answer in Markdown fences.",
    "When the input comes from OCR, silently repair obvious OCR line-break artifacts while preserving the text's meaning.",
  ].join(" ");

  const user = [
    `Target language: ${request.targetLanguageTitle}.`,
    `Style: ${styleInstructions[request.style]}`,
    "Preserve names, URLs, inline code, citations, numbers, and list structure.",
    "If the text is already in the target language, improve clarity without changing the meaning.",
    "",
    "Text:",
    request.text,
  ].join("\n");

  return { system, user };
}
