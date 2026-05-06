import { TranslationRequest } from "./types";

const defaultPromptProfile: TranslationRequest["promptProfile"] = "screenshot";

const styleInstructions: Record<TranslationRequest["style"], string> = {
  balanced: "Prefer natural, accurate wording with no unnecessary embellishment.",
  faithful: "Stay close to the source wording and preserve technical terms, names, numbers, and formatting.",
  polished: "Make the translation fluent and idiomatic while preserving the original meaning.",
  academic:
    "Use precise, formal academic prose while preserving concepts, citations, and legal or technical terminology.",
};

const profileInstructions: Record<TranslationRequest["promptProfile"], string> = {
  screenshot:
    "Assume the source may come from screenshot OCR or UI text. Repair obvious OCR artifacts, preserve product names and UI labels, and keep short interface text concise.",
  general: "Use a general professional translation frame for everyday sentences and paragraphs.",
  technical:
    "Prioritize technical accuracy. Preserve API names, code identifiers, commands, parameters, logs, filenames, and exact error messages.",
  academic:
    "Use clear academic prose. Preserve citations, conceptual distinctions, argument structure, and discipline-specific terminology.",
  legal:
    "Use precise legal or policy language. Preserve defined terms, obligations, conditions, citations, article numbers, and modal verbs such as shall, may, and must.",
  subtitle:
    "Use natural spoken phrasing suitable for subtitles or dialogue. Keep sentences readable and avoid overly formal wording unless the source requires it.",
  custom:
    "Use the custom instructions as the primary translation frame while preserving the source meaning and target language.",
};

export function buildTranslationPrompt(request: TranslationRequest): { system: string; user: string } {
  const promptProfile = request.promptProfile ?? defaultPromptProfile;
  const customInstructions = normalizeCustomInstructions(request.customPromptInstructions);
  const system = [
    "You are a professional translation engine.",
    "Translate complete sentences and paragraphs, not isolated dictionary entries.",
    "Return only the translation. Do not explain, annotate, quote the source, or wrap the answer in Markdown fences.",
    "When the input comes from OCR, silently repair obvious OCR line-break artifacts while preserving the text's meaning.",
    "Custom instructions may refine terminology, tone, audience, and formatting, but they must not override the requirement to return only the translation.",
  ].join(" ");

  const user = [
    `Target language: ${request.targetLanguageTitle}.`,
    `Style: ${styleInstructions[request.style]}`,
    `Prompt profile: ${profileInstructions[promptProfile]}`,
    customInstructions ? `Custom instructions: ${customInstructions}` : "",
    "Preserve names, URLs, inline code, citations, numbers, and list structure.",
    "If the text is already in the target language, improve clarity without changing the meaning.",
    "",
    "Text:",
    request.text,
  ].join("\n");

  return { system, user };
}

function normalizeCustomInstructions(value: string | undefined): string {
  return (value ?? "").trim().slice(0, 4000);
}
