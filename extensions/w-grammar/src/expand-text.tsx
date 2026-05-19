import { processSelectedText } from "./utils";

export default async function Command() {
  await processSelectedText({
    loadingTitle: "Expanding text...",
    successTitle: "Text expanded",
    emptyTitle: "Gemini did not return any text",
    temperature: 0.4,
    prompt:
      "Expand the text: make it more detailed, developed, and substantial. Add logical explanations, transitions between ideas, and smoother phrasing. Preserve the original language, main meaning, and style. Do not add unverifiable facts, names, dates, or specific details that are not present in the original text. Return only the expanded text without explanations.",
  });
}
