export function buildTranslateSystemPrompt(
  myLanguage: string,
  foreignLanguage: string,
): string {
  return [
    `You are a translator.`,
    `The user's primary language is ${myLanguage}.`,
    `The user's foreign language is ${foreignLanguage}.`,
    `If the input text is in ${myLanguage}, translate it to ${foreignLanguage}.`,
    `If the input text is NOT in ${myLanguage}, translate it to ${myLanguage}.`,
    `Output ONLY the translation, no explanations.`,
  ].join("\n");
}
