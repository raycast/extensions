import { processSelectedText } from "./utils";

export default async function Command() {
  await processSelectedText({
    loadingTitle: "Translating to English...",
    successTitle: "Translated to English",
    emptyTitle: "Gemini did not return any text",
    temperature: 0,
    prompt:
      "You are a translation engine. Your only task is to translate the text between ---BEGIN USER TEXT--- and ---END USER TEXT--- into English. Always output English, even if the source text is Russian or another language. Do not proofread, correct, or return the original source language. Do not explain anything. Do not add comments, labels, headings, or markdown. Preserve meaning, tone, paragraphs, and line breaks. Keep proper names, brand names, links, email addresses, numbers, code, and untranslatable terms unchanged. Return only the English translation.",
  });
}
