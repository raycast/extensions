import { chatText, type ChatConfig } from "./client";
import { getLanguageTitle, resolveTargetLanguage } from "./languages";

export type TranslationStyle =
  | "balanced"
  | "faithful"
  | "polished"
  | "academic";
export type TranslationProfile =
  | "general"
  | "technical"
  | "academic"
  | "legal"
  | "subtitle";
export type TranslationPromptMode = "translate" | "express-intent";
export type ExpressionTone = "natural" | "casual" | "formal" | "concise";

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  targetLanguageTitle: string;
  style: TranslationStyle;
  promptProfile: TranslationProfile;
  mode?: TranslationPromptMode;
  expressionTone?: ExpressionTone;
}

export interface TranslateTextOptions {
  preferredLanguage?: string;
  mode?: TranslationPromptMode;
  style?: TranslationStyle;
  promptProfile?: TranslationProfile;
  expressionTone?: ExpressionTone;
  fetchImpl?: typeof fetch;
}

export interface TranslateTextResult {
  translation: string;
  coaching?: string;
  targetLanguage: string;
  targetLanguageTitle: string;
}

const styleInstructions: Record<TranslationStyle, string> = {
  balanced:
    "Prefer natural, accurate sense-for-sense translation with no unnecessary embellishment.",
  faithful:
    "Stay close to the source wording and preserve technical terms, names, numbers, and formatting.",
  polished:
    "Make the translation fluent and idiomatic in the target language while preserving the original meaning.",
  academic:
    "Use precise, formal academic prose while preserving concepts, citations, and legal or technical terminology.",
};

const profileInstructions: Record<TranslationProfile, string> = {
  general:
    "Use a general professional translation frame for everyday sentences and paragraphs.",
  technical:
    "Prioritize technical accuracy. Preserve API names, code identifiers, commands, parameters, logs, filenames, and exact error messages.",
  academic:
    "Use clear academic prose. Preserve citations, conceptual distinctions, argument structure, and discipline-specific terminology.",
  legal:
    "Use precise legal or policy language. Preserve defined terms, obligations, conditions, citations, article numbers, and modal verbs such as shall, may, and must.",
  subtitle:
    "Use natural spoken phrasing suitable for subtitles or dialogue. Keep sentences readable and avoid overly formal wording unless the source requires it.",
};

const DIRECT_OUTPUT_RULE =
  "Return only the final output. Do not explain, annotate, quote the source, or wrap the answer in Markdown fences.";

const EXPRESSION_OUTPUT_RULE =
  'Return ONLY a JSON object with this exact shape: {"expression": string, "why": string}. No Markdown fences. "expression" is the final English wording only. "why" is a Simplified Chinese coaching note formatted as 2-5 Markdown bullets, each starting with "- ".';

const expressionToneInstructions: Record<ExpressionTone, string> = {
  natural:
    "Use the default everyday register a native English speaker would naturally use in this situation.",
  casual:
    "Make it more casual and conversational while keeping it clear and broadly understandable.",
  formal:
    "Make it more formal and professional without sounding stiff, bureaucratic, or robotic.",
  concise:
    "Make it concise and direct while preserving the meaning, practical constraints, and natural tone.",
};

export function resolveTranslationTarget(
  preferredLanguage: string | undefined,
  text: string,
): { language: string; title: string } {
  const language = resolveTargetLanguage(preferredLanguage, text);
  return { language, title: getLanguageTitle(language) };
}

export function buildTranslationPrompt(request: TranslationRequest): {
  system: string;
  user: string;
} {
  const mode = request.mode ?? "translate";
  const system = [
    `Role:\n${systemRole(mode)}`,
    [
      "Internal context check:",
      "Before writing the answer, internally infer the speaker's intent, situation, relationship, implied tone, and practical purpose.",
      "Use that inference only to choose wording; do not reveal this analysis.",
    ].join("\n"),
    `Natural target-language standard:\n${nativeExpressionInstruction(request.targetLanguageTitle)}`,
    `Task rules:\n${taskInstruction(mode)}`,
    mode === "express-intent"
      ? `Expression tone:\n${expressionToneInstructions[request.expressionTone ?? "natural"]}`
      : "",
    `SkillOpt-style validation gate:\n${validationGateInstruction(mode)}`,
    `Output use:\n${outputUseInstruction(mode)}`,
    `Output format:\n${mode === "express-intent" ? EXPRESSION_OUTPUT_RULE : DIRECT_OUTPUT_RULE}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const user = [
    `Target language: ${request.targetLanguageTitle}.`,
    `Task: ${mode === "express-intent" ? "Express the source intention naturally in the target language." : "Translate the source text by meaning."}`,
    `Style: ${styleInstructions[request.style]}`,
    `Prompt profile: ${profileInstructions[request.promptProfile]}`,
    mode === "express-intent"
      ? `Expression tone: ${expressionToneInstructions[request.expressionTone ?? "natural"]}`
      : "",
    "Preserve names, URLs, inline code, citations, numbers, and list structure.",
    mode === "express-intent"
      ? "The source may be rough Chinese notes or an intention brief. Do not mirror its wording, sentence order, filler words, or Chinese politeness formulas when a native speaker would phrase the idea differently."
      : "If the text is already in the target language, improve clarity without changing the meaning.",
    "",
    mode === "express-intent" ? "Intention:" : "Text:",
    request.text,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

export async function translateText(
  text: string,
  cfg: ChatConfig,
  preferredLanguageOrOptions: string | TranslateTextOptions = "auto",
  fetchImpl: typeof fetch = fetch,
): Promise<TranslateTextResult> {
  const options =
    typeof preferredLanguageOrOptions === "string"
      ? { preferredLanguage: preferredLanguageOrOptions, fetchImpl }
      : {
          preferredLanguage: preferredLanguageOrOptions.preferredLanguage,
          mode: preferredLanguageOrOptions.mode,
          style: preferredLanguageOrOptions.style,
          promptProfile: preferredLanguageOrOptions.promptProfile,
          expressionTone: preferredLanguageOrOptions.expressionTone,
          fetchImpl: preferredLanguageOrOptions.fetchImpl ?? fetch,
        };
  const mode = options.mode ?? "translate";
  const target = resolveTranslationTarget(options.preferredLanguage, text);
  const prompt = buildTranslationPrompt({
    text,
    targetLanguage: target.language,
    targetLanguageTitle: target.title,
    style:
      options.style ?? (mode === "express-intent" ? "polished" : "balanced"),
    promptProfile: options.promptProfile ?? "general",
    expressionTone: options.expressionTone,
    mode,
  });
  const raw = await chatText(
    cfg,
    prompt.system,
    prompt.user,
    options.fetchImpl,
  );
  const parsed =
    mode === "express-intent"
      ? parseExpressionCoachResult(raw)
      : { expression: stripMarkdownFence(raw), why: undefined };
  return {
    translation: parsed.expression,
    coaching: parsed.why,
    targetLanguage: target.language,
    targetLanguageTitle: target.title,
  };
}

function systemRole(mode: TranslationPromptMode): string {
  if (mode === "express-intent") {
    return "You are a professional cross-language expression coach and native-language editor.";
  }
  return "You are a professional meaning-first translator and native-language editor.";
}

function taskInstruction(mode: TranslationPromptMode): string {
  if (mode === "express-intent") {
    return asBullets([
      "Treat the prompt as a reusable skill artifact: follow these rules in order and do not invent a different task.",
      "Treat the source as the user's intended meaning, not as a sentence that must be mirrored.",
      "Write the result as something a native speaker of the target language would actually say or write in that situation.",
      "Choose natural collocations, register, directness, and sentence shape for the target culture.",
      "If the source says the user wants to say, remind, ask, explain, or express something, treat that framing as task instruction and write the actual utterance, not a report about wanting to say it.",
      "When the intention is addressed to someone, address that person directly unless the source clearly asks for third-person reporting.",
      "Preserve practical constraints such as deadlines, requested actions, permissions, and conditions while adapting the tone.",
      "Keep dates and deadlines precise; do not weaken, move, or blur them to sound more polite.",
      "Do not add unsupported concessions, excuses, alternatives, placeholder names, greetings, sign-offs, apologies, or promises merely to sound natural.",
      "Do not preserve Chinese word order, topic-comment structure, stock phrases, or literal politeness formulas unless they are genuinely natural in the target language.",
      "Do not invent new facts, promises, relationships, or emotional intensity that are not supported by the intention.",
      "Before final output, internally check the candidate against the validation gate. If any gate fails, revise the candidate once and output the repaired version.",
    ]);
  }
  return "Translate complete sentences and paragraphs by meaning, not as isolated dictionary entries.";
}

function nativeExpressionInstruction(targetLanguageTitle: string): string {
  const instructions = [
    `Write in ${targetLanguageTitle} the way a native speaker would naturally express the same idea.`,
    "Prefer idiomatic, fluent target-language wording over literal word-for-word translation.",
    "Restructure sentences when needed so the result reads as originally written in the target language.",
    "Do not over-interpret, summarize, embellish, or add information that is not present in the source.",
    "Preserve the speaker's intent, tone, emphasis, factual content, and level of formality.",
  ];
  if (targetLanguageTitle.toLowerCase().includes("chinese")) {
    instructions.push(
      "For Chinese, write as a native Chinese speaker would describe the same idea, not as English syntax rewritten with Chinese words.",
    );
  } else if (targetLanguageTitle.toLowerCase().includes("english")) {
    instructions.push(
      "For English, prefer concise, idiomatic wording; for polite requests, use clear modal phrasing such as could you or would it be possible rather than layered hedges or roundabout source-language buffers.",
      "Good English intent-expression examples: `我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。` -> `Could you send me the file by this afternoon when you get a chance?`; `我想跟外国同事说，这事不是你做得不好，是我们之前没有把要求讲清楚。` -> `This isn't about you doing a bad job; we just didn't make the requirements clear enough from the start.`",
    );
  } else {
    instructions.push(
      "Avoid source-language calques and over-formal phrasing when a native speaker would choose a simpler expression.",
    );
  }
  return asBullets(instructions);
}

function validationGateInstruction(mode: TranslationPromptMode): string {
  if (mode === "express-intent") {
    return asBullets([
      "Meaning gate: preserve the source intent, requested action, deadline, responsibility, and politeness level.",
      "Naturalness gate: sound like native English, not Chinese syntax with English words.",
      "No-addition gate: do not add greetings, apologies, excuses, concessions, relationships, placeholders, or promises unless the source requires them.",
      "Speakability gate: keep the expression short and rhythmic enough to read aloud naturally for pronunciation practice.",
      "Coaching gate: explain concrete wording, register, rhythm, or calque-avoidance choices in Simplified Chinese; avoid generic praise.",
    ]);
  }
  return asBullets([
    "Faithfulness gate: preserve the source meaning, names, numbers, links, code, citations, and list structure.",
    "Naturalness gate: the target text reads as native writing rather than source-language syntax.",
    "No-addition gate: do not add unsupported explanation, facts, or commentary.",
  ]);
}

function outputUseInstruction(mode: TranslationPromptMode): string {
  if (mode === "express-intent") {
    return [
      "The result may be pasted into a message or read aloud by a text-to-speech model.",
      "Use plain text, avoid document-style symbols, and keep sentences short enough to sound natural when spoken.",
      "Remove stiff, generic AI-sounding polish; keep the human intent concrete and direct.",
    ].join(" ");
  }
  return [
    "The result should be clean copy-ready text.",
    "Avoid document-style symbols unless they are needed to preserve an explicit source list, code block, citation, or table-like structure.",
    "For conversational source text, prefer shorter sentences that would sound natural if read aloud.",
  ].join(" ");
}

function asBullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function stripMarkdownFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseExpressionCoachResult(raw: string): {
  expression: string;
  why?: string;
} {
  const cleaned = extractJsonObject(raw);
  try {
    const parsed = JSON.parse(cleaned) as {
      expression?: unknown;
      rewritten?: unknown;
      translation?: unknown;
      why?: unknown;
      coaching?: unknown;
    };
    const expression = firstString(
      parsed.expression,
      parsed.rewritten,
      parsed.translation,
    );
    if (!expression) return { expression: stripMarkdownFence(raw) };
    return {
      expression,
      why: firstString(parsed.why, parsed.coaching),
    };
  } catch {
    return { expression: stripMarkdownFence(raw) };
  }
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function extractJsonObject(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  if (stripped.startsWith("{") && stripped.endsWith("}")) return stripped;

  const start = stripped.indexOf("{");
  if (start === -1) return stripped;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < stripped.length; i++) {
    const char = stripped[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) return stripped.slice(start, i + 1);
    }
  }
  return stripped;
}
