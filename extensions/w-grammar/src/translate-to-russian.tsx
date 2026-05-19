import { processSelectedText } from "./utils";

export default async function Command() {
  await processSelectedText({
    loadingTitle: "Translating to Russian...",
    successTitle: "Translated to Russian",
    emptyTitle: "Gemini did not return any text",
    temperature: 0,
    prompt:
      "Translate the text into Russian. Preserve the meaning, tone, formatting, paragraphs, and line breaks. Do not distort names, brand names, terms, links, email addresses, numbers, or code. Do not add explanations, comments, notes, headings, labels, or markdown. Return only the Russian translation.",
  });
}
