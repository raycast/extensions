/**
 * Minimum length of text to summarize.
 * Any text shorter than this will return early from the hook.
 */
const MIN_TEXT_LENGTH = 100;

/**
 * Factor to ensure we don't hit rate limits.
 * Used to safeguard against firing too many requests and getting a 429 error.
 */
const REQUEST_LIMIT_FACTOR = 7;

/**
 * Custom React hook to fetch AI-generated summary based on user preferences.
 *
 * @param text - The text to summarize.
 * @returns An object containing the summary, loading state, and preference messages.
 */

import { useState, useEffect } from "react";
import { getPreferenceValues, AI, environment, showToast } from "@raycast/api";
import { getSummary, getTokens, getBlockSummaries } from "../utils";
import { LLMParams } from "../interfaces";
import { getModelUsableTokens } from "../AskLLM";

import {
  NO_ACCESS_TO_RAYCAST_AI,
  NO_OPENAI_KEY,
  LONG_TEXT,
  SUMMARIZING_TEXT,
  SUCCESS_SUMMARIZING_TEXT,
  ERROR_SUMMARIZING_TEXT,
  TEXT_TOO_LONG,
} from "../constants";

const useAISummary = (text: string | null): { summary: string | null; isLoading: boolean; prefMessage: string } => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prefMessage, setPrefMessage] = useState("");

  // Fetch and store user preferences into an object of type LLMParams for generating AI summaries.
  const preferences = getPreferenceValues();
  const LLMParams: LLMParams = {
    modelName: preferences.chosenModel || "raycast-gpt-3.5-turbo",
    openaiApiToken: preferences.openaiApiToken || null,
    creativity: Number(preferences.creativity) || 0.75,
    language: preferences.language || "English",
  };

  useEffect(() => {
    /**
     * Asynchronous function to fetch summary using AI.
     */
    const fetchSummary = async () => {
      setIsLoading(true);

      // return early if no text or text is too short
      if (!text || text.length < MIN_TEXT_LENGTH) {
        setIsLoading(false);
        // console.log("No text, returning early.");
        return;
      }

      // Calculate token counts to manage API rate limits.
      const maxUsableTokens = getModelUsableTokens(LLMParams.modelName);
      const textTokens = getTokens(text);

      // Check if the text length is too long for the 10 per minute rate limit
      if (textTokens > maxUsableTokens * REQUEST_LIMIT_FACTOR) {
        setIsLoading(false);
        const prefMessage = `"Text is too long (${text.length} characters and ${getTokens(
          text
        )} tokens). Try to select a mode that supports this size"`;
        setPrefMessage(prefMessage);
        showToast(TEXT_TOO_LONG);
        return;
      }

      // handle no access to raycast AI
      if (LLMParams.modelName.startsWith("raycast") && !environment.canAccess(AI)) {
        setPrefMessage("No Access to Raycast AI. You need a pro subscription to use this extension.");
        showToast(NO_ACCESS_TO_RAYCAST_AI);
        return;
      }

      // handle no openAI key
      if (LLMParams.modelName.startsWith("OPENAI-") && !LLMParams.openaiApiToken) {
        setPrefMessage(
          "No Open AI API Key provided. If you want to use OpenAI models, you need to provide an OpenAI API key in preferences."
        );
        showToast(NO_OPENAI_KEY);
        return;
      }

      // TODO handle no access to openAI eg wrong API key

      try {
        //  throw new Error("Stopping here for debugging");
        // console.log(`Command name: ${environment.commandName}`);
        showToast(textTokens > maxUsableTokens ? LONG_TEXT : SUMMARIZING_TEXT);

        let finalSummary = "";
        // if we want final summary or have a short text, we use final summary
        if (environment.commandName === "summarizeLongText" || textTokens < maxUsableTokens) {
          // console.log("in summarizeLongText");
          // Fetch summary from AI
          finalSummary = await getSummary(text as string, LLMParams);
        }
        // if we want the summaries of chunks without final summarization, we use block summaries
        else if (environment.commandName === "summarizeBlocks") {
          // console.log("in summarizeBlocks");
          finalSummary = await getBlockSummaries(text as string, LLMParams);
        }
        setSummary(finalSummary);
        setIsLoading(false);

        showToast({
          ...SUCCESS_SUMMARIZING_TEXT,
          message: `Summary tokens: ${getTokens(finalSummary)}`,
        });
      } catch (error: unknown) {
        error instanceof Error && showToast({ ...ERROR_SUMMARIZING_TEXT, message: error.message });
      }
    };

    fetchSummary();
  }, [text]);

  return { summary, isLoading, prefMessage };
};

export default useAISummary;
