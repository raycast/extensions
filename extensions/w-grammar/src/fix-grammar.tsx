import { processSelectedText } from "./utils";

export default async function Command() {
  await processSelectedText({
    loadingTitle: "Fixing grammar and punctuation...",
    successTitle: "Text fixed",
    emptyTitle: "Gemini did not return any text",
    temperature: 0,
    prompt:
      "Perform strict proofreading without stylistic rewriting. Fix spelling, grammar, typos, punctuation, spacing, and technical text formatting. Fix not only obvious errors, but also subtle punctuation and typography issues. Correctly use commas, colons, semicolons, quotation marks, parentheses, hyphens, en dashes, and em dashes. Distinguish between hyphen, minus sign, en dash, and em dash: use hyphens inside words, minus signs for negative numbers and mathematical expressions, en dashes for ranges, and em dashes for punctuation pauses in English text. For Russian text, use appropriate Russian punctuation and typography rules. Fix formatting of numbers, percentages, currencies, units of measurement, dates, time, ranges, and abbreviations. Use correct spacing between numbers and currency signs, percentages, and units of measurement according to the rules of the source language. Fix double spaces, extra spaces before punctuation marks, and missing spaces after them. Use quotation marks appropriate for the language, such as «guillemets» for Russian and “curly quotes” for English when appropriate. Preserve the original language, meaning, tone, structure, paragraphs, and line breaks. Do not improve style, do not replace normal wording, do not rewrite sentences unless necessary, and do not add new ideas, facts, or details. Return only the corrected text without explanations.",
  });
}
