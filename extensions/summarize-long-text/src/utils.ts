import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import AskLLM from "./AskLLM";
import { getBlockSummaryPrompt, getFinalSummaryPrompt } from "./prompts";
import { encodingForModel } from "js-tiktoken";
import { LLMParams } from "./interfaces";

// Define an interface for the result from the AI
interface AIResult {
  text: string;
}

/**
 * Splits a given text into smaller chunks.
 *
 * @param text - The text to be split.
 * @param chunkSize - Maximum size of each chunk.
 * @param chunkOverlap - Number of overlapping characters between chunks.
 * @returns An array of text chunks.
 */
export const splitText = async (text: string, chunkSize = 1000, chunkOverlap = 0): Promise<string[]> => {
  // Initialize the text splitter
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap,
  });

  // Perform the text split operation
  const docOutput = await splitter.splitDocuments([new Document({ pageContent: text })]);

  // Return the chunks
  return docOutput.map((doc: Document) => doc.pageContent);
};

/**
 * Splits a given text into smaller chunks, summarizes each chunk, and returns the summaries.
 *
 * @param text - The text to be split and summarized.
 * @param LLMParams - LLM parameters set in Preferences.
 * @returns A string of concatenated summaries.
 */
export const getBlockSummaries = async (text: string, LLMParams: LLMParams): Promise<string> => {
  const splitTexts = await splitText(text, LLMParams.maxChars, 0);
  console.log("SplitTexts: ", splitTexts.length);

  // Generate summaries for each text block
  const temporarySummaries = await Promise.all(
    splitTexts.map(async (summaryBlock, i) => {
      const prompt = getBlockSummaryPrompt(i, splitTexts.length, summaryBlock, LLMParams.maxChars, LLMParams.language);
      const aiResult: AIResult = await AskLLM(prompt, LLMParams);
      return aiResult.text;
    })
  );
  return temporarySummaries.join("\n");
};

/**
 * Generates a summary for a given text.
 *
 * @param text - The text to summarize.
 * @param LLMParams - Object containing parameters like maximum number of characters (`maxChars`) and language set in preferences.
 * @returns The generated summary.
 */
export const getSummary = async (text: string, LLMParams: LLMParams): Promise<string> => {
  // If text is too long, we need to split it in smaller chunks
  if (text.length > LLMParams.maxChars) {
    text = await getBlockSummaries(text, LLMParams);
  }
  const prompt = getFinalSummaryPrompt(text, LLMParams.language);
  const result: AIResult = await AskLLM(prompt, LLMParams);
  return result.text;
};

/**
 * Calculates the number of characters and tokens used for a text
 *
 * @param text - The text to analyze.
 * @param encoding - Encoding to calculate tokens.
 * @returns Object containing the number of characters and tokens.
 */
export const getCharsAndTokens = (text: string): { chars: number; tokens: number } => {
  const encoding = encodingForModel("gpt-4");
  const tokens = encoding.encode(text).length; // Assumes getEncoding().encode() is a valid function
  const chars = text.length;
  return { chars, tokens }; // Return as an object
};
