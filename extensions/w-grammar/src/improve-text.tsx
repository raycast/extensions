import { processSelectedText } from "./utils";

export default async function Command() {
  await processSelectedText({
    loadingTitle: "Carefully improving text...",
    successTitle: "Text improved",
    emptyTitle: "Gemini did not return any text",
    temperature: 0.2,
    prompt:
      "Carefully edit the text. Fix errors, punctuation, and only those phrases that sound unnatural, rude, awkward, unclear, or unprofessional. If a phrase already sounds fine, do not change it. Do not rewrite the entire text. Do not change the style unless necessary. Do not add new thoughts, facts, or details. Preserve the original language, meaning, tone, structure, formatting, and line breaks. Return only the final text without explanations.",
  });
}
