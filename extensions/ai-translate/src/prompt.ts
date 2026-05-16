import { TranslationRequest } from "./types";

const defaultPromptProfile: TranslationRequest["promptProfile"] = "screenshot";

const styleInstructions: Record<TranslationRequest["style"], string> = {
  balanced: "Prefer natural, accurate sense-for-sense translation with no unnecessary embellishment.",
  faithful: "Stay close to the source wording and preserve technical terms, names, numbers, and formatting.",
  polished: "Make the translation fluent and idiomatic in the target language while preserving the original meaning.",
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
    "You are a professional AI translator.",
    nativeExpressionInstruction(request.targetLanguageTitle),
    "Translate complete sentences and paragraphs by meaning, not as isolated dictionary entries.",
    "Return only the translation. Do not explain, annotate, quote the source, or wrap the answer in Markdown fences.",
    "When the input comes from OCR, silently repair obvious OCR line-break artifacts while preserving the text's meaning.",
    "Custom instructions may refine or override profile and style preferences for terminology, tone, audience, and formatting, but they must not override the requirements to preserve the source meaning and return only the translation.",
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

function nativeExpressionInstruction(targetLanguageTitle: string): string {
  const generalInstruction = [
    `Write in ${targetLanguageTitle} the way a native speaker would naturally express the same idea.`,
    "Prefer idiomatic, fluent target-language wording over literal word-for-word translation.",
    "Restructure sentences when needed so the result reads as originally written in the target language.",
    "Do not over-interpret, summarize, embellish, or add information that is not present in the source.",
    "Preserve the speaker's intent, tone, emphasis, factual content, and level of formality.",
  ];

  if (targetLanguageTitle.toLowerCase().includes("chinese")) {
    generalInstruction.push(
      "For Chinese, write as a native Chinese speaker would describe the same idea, not as English syntax rewritten with Chinese words.",
    );
  }

  return generalInstruction.join(" ");
}

export function buildRewriteCoachPrompt(text: string): { system: string; user: string } {
  const system = [
    "You are a bilingual English writing coach for a Chinese native speaker who wants to sound like a natural English speaker.",
    "",
    "REWRITE RULES:",
    "Rewrite the selected text so it sounds natural, idiomatic, and conversational, like something a native English speaker would actually say.",
    "If the selected text is in English, rewrite it in natural, everyday English. Keep the original meaning, intent, and level of politeness. Prefer everyday wording over stiff, formal, or textbook phrasing. Do not add new information. If the text is already natural, make only minimal edits.",
    "If the selected text is in Chinese, render it as how a native English speaker would naturally express the same idea — not a literal or word-for-word translation, but the way someone would actually say it in English in real life. Match the tone, register, and politeness of the original. Do not add new information.",
    "",
    "COACHING:",
    "After rewriting, explain in Simplified Chinese why your version sounds more natural than the original. Point out the specific changes — word choice, collocations, idioms, sentence rhythm, register — and name the typical Chinese-learner habit each change fixes. Quote the English snippets you discuss. Be concrete and concise: 2 to 5 short bullet points.",
    "",
    "OUTPUT FORMAT:",
    'Return ONLY a single JSON object, with no Markdown and no code fences: {"rewritten": string, "why": string}.',
    '"rewritten" must contain only the rewritten text itself — no labels, no surrounding quotation marks, no Markdown.',
    '"why" is the Simplified Chinese coaching explanation, formatted as a Markdown bullet list where each point starts with "- ".',
  ].join("\n");

  const user = ["Selected text:", text].join("\n");

  return { system, user };
}
