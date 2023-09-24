import { getPreferenceValues } from "@raycast/api";
const preferences = getPreferenceValues();
const defaultLanguage = preferences.language || "English";

/**
 * Generates a prompt for summarizing a block of text.
 *
 * @param index - The current block index (0-based).
 * @param splitTexts - The total number of text blocks.
 * @param summaryBlock - The content of the current text block.
 * @param maxChars - The maximum number of characters for the summary.
 *  @param language - The language in which the summary should be written. Defaults to "English".

 * @returns A prompt string for summarizing the block.
 */
export function getBlockSummaryPrompt(
  index: number,
  splitTexts: number,
  summaryBlock: string,
  maxChars: number,
  language: string = defaultLanguage
): string {
  if (!summaryBlock) {
    throw `No text provided. Unable to generate prompt.`;
  }
  return `Summarize the the text below. Pay attention to key facts, people and places, 
the main storyline and ideas, reasoning, and perspectives. This text is part of a larger
document. This is part ${index + 1} of ${splitTexts}. 
Keep these in mind:
- Pay attention to key facts, people and places, the main storyline and ideas, reasoning, and perspectives.
- Use only important ideas and information
- Explain why the story is important and what it means overall
- Don't use any information not in the text below
 -Use simple words and short sentences so everyone can understand it
- Use bullet points if possible
- Write in Axios Smart Brevity style - quick and clear
- In no case use more than ${Math.round(maxChars / splitTexts)} characters 
- Summary should be in ${language}
- Start the summary with the text "\n<Summary of part ${index + 1} of ${splitTexts}>\n

Provided Text:
${summaryBlock}
`;
}

/**
 * Generates a final summary prompt based on the provided text summaries.
 *
 * @param text - The text to summarize.
 * @param language - The language in which the summary should be written. Defaults to "English".
 * @returns A prompt string for generating the final summary.
 */
export function getFinalSummaryPrompt(text: string | undefined, language = defaultLanguage): string {
  if (!text) {
    throw `No text provided. Unable to generate prompt.`;
  }

  return `Below are summaries of chunks of a larger text. Use these chunk summarize to write an 
easy-to-understand summary of the complete text. Keep these in mind:
- Pay attention to key facts, people and places, the main storyline and ideas, reasoning, and perspectives.
- Use only important ideas and information
- Explain why the story is important and what it means overall
- Don't use any information not in the text below
 -Use simple words and short sentences so everyone can understand it
- Use bullet points if possible
- Write in Axios Smart Brevity style - quick and clear
- Summary should be in ${language}

Provided Text:
${text}`;
}
