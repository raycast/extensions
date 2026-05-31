import { RewriteTone, TranslationRequest } from "./types";

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

const rewriteToneInstructions: Record<RewriteTone, string> = {
  natural: "Aim for the default everyday register a native speaker would naturally use in this situation.",
  casual:
    "Make it noticeably more casual and conversational — relaxed and friendly, the way you'd talk to a friend or write a casual message. Avoid slang that would be hard to understand.",
  formal:
    "Make it more formal and professional — polished and appropriate for work emails, documents, or business settings, without sounding stiff, bureaucratic, or robotic.",
  concise:
    "Make it as concise and punchy as possible while keeping the original meaning and a natural tone — cut filler words and tighten the phrasing.",
};

export function buildRewriteCoachPrompt(text: string, tone: RewriteTone = "natural"): { system: string; user: string } {
  const system = [
    "You are a bilingual English writing coach for a Chinese native speaker who wants to sound natural in English.",
    "",
    "REWRITE RULES:",
    "Rewrite the selected text into natural, idiomatic English that fits the situation.",
    "If the selected text is English, keep the meaning and politeness level, prefer everyday wording, and make only minimal edits when it is already natural.",
    "If the selected text is Chinese, read it as the user's intended message rather than as wording to translate word for word.",
    'When the Chinese input says "I want to say/remind/ask/explain/tell someone...", output the message the user should actually say to that person. Do not output "I want to say...".',
    "Address the listener directly when appropriate.",
    "Preserve concrete constraints such as deadlines, requested actions, permissions, conditions, responsibility, and degree of urgency.",
    'Do not soften or generalize deadlines: "by this afternoon" must not become "by the end of the day", "sometime today", or "ideally this afternoon".',
    "Do not add greetings, openers, apologies, titles, name placeholders, sign-offs, excuses, concessions, or facts that the source did not provide.",
    'Do not start with "Hi", "Hey", "Dear", "Sorry to bother you", or similar openers unless the source explicitly includes them.',
    "Start with the substantive message, not a greeting. This applies even in service, hotel, email, and workplace contexts.",
    'Do not add phrases like "No worries if not" or "No rush" when the source gives a deadline or requested action.',
    'Keep polite requests clear and concise, using direct modal forms such as "Could you..." or "Would it be possible..." where they fit.',
    "Avoid Chinese calques, textbook phrasing, and overly formal wording unless the source clearly requires it.",
    `TONE: ${rewriteToneInstructions[tone]}`,
    "",
    "COACHING:",
    "After rewriting, explain in Simplified Chinese why your version sounds more natural. Focus on concrete choices in word choice, register, rhythm, and avoided Chinese-to-English calques. Be concise: 2 to 5 short bullet points.",
    "",
    "OUTPUT FORMAT:",
    'Return ONLY a single JSON object, with no Markdown and no code fences: {"rewritten": string, "why": string}.',
    '"rewritten" must contain only the final English wording itself — no labels, no surrounding quotation marks, no Markdown.',
    '"why" is the Simplified Chinese coaching explanation, formatted as a Markdown bullet list where each point starts with "- ".',
  ].join("\n");

  const user = ["Selected text:", text].join("\n");

  return { system, user };
}
