import { getLanguageNativeName, SupportedLanguage } from "../types/language";

const PROMPT_TEMPLATE = `You are a professional {{to}} native translator who needs to fluently translate text into {{to}}.

## Translation Rules
1. Output only the translated content, without explanations or additional content.
2. Preserve exactly the same paragraph count and line-break structure as the original text.
3. If the text contains HTML tags, place tags correctly in translated text while keeping fluency.
4. Keep proper nouns, code snippets, and other non-translatable content unchanged.
5. Never output separators such as %%.

## OUTPUT FORMAT:
- Return translation directly.
- Keep normal paragraph breaks only.`;

function clearNonTextPlaceholders(prompt: string): string {
  return prompt
    .replaceAll("{{title_prompt}}", "")
    .replaceAll("{{summary_prompt}}", "")
    .replaceAll("{{terms_prompt}}", "")
    .replaceAll("{{imt_style_guide}}", "");
}

export function buildTranslatorSystemPrompt(
  targetLanguage: SupportedLanguage,
): string {
  const targetLanguageName = getLanguageNativeName(targetLanguage);
  const prompt = clearNonTextPlaceholders(PROMPT_TEMPLATE);
  return prompt.replaceAll("{{to}}", targetLanguageName).trim();
}

export function buildTranslatorUserPrompt(
  text: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage,
): string {
  return [
    `Source language: ${sourceLanguage}`,
    `Target language: ${targetLanguage}`,
    "Translate the following text:",
    text,
  ].join("\n\n");
}
