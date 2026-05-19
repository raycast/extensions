import { processSelectedText } from "./utils";

export default async function Command() {
  await processSelectedText({
    loadingTitle: "Summarizing text...",
    successTitle: "Text summarized",
    emptyTitle: "Gemini did not return any text",
    temperature: 0,
    prompt:
      "Strongly summarize the text. Keep only the main points, remove repetition, unnecessary details, and secondary wording. Preserve the original language and main meaning. The final text must be significantly shorter than the original. Return only the summarized text without explanations.",
  });
}
