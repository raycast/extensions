/**
 * Custom React hook to fetch AI-generated summary based on user preferences.
 *
 * @param text - The text to summarize.
 * @returns An object containing the summary, loading state, and preference messages.
 */

import { useState, useEffect } from "react";
import { getPreferenceValues, AI, environment, showToast } from "@raycast/api";
import { getSummary, getCharsAndTokens, getBlockSummaries } from "../utils";
import { LLMParams } from "../interfaces";

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
    maxChars: Number(preferences.maxChars) || 5000,
    language: preferences.language || "English",
  };

  useEffect(() => {
    /**
     * Asynchronous function to fetch summary using AI.
     */
    const fetchSummary = async () => {
      setIsLoading(true);

      // this is mainly to prevent the extension from accidentally firing
      // while developing
      if (!text || text.length < 100) {
        setIsLoading(false);
        console.log("No text, returning early.");
        return;
      }

      // both openAI and raycast AI have a limit of 10 requests per minute
      // if text is too long, we run the risk of firing to many requests
      // and getting a 429 error
      // use 7 as a factor to account for prompt text and a bit of slack
      // TODO: maybe use utils.getCharsAndTokens() to calculate promp and text lenght
      // and be more precise
      if (text.length > LLMParams.maxChars * 7) {
        setIsLoading(false);
        const prefMessage = `"Text is too long (${
          text.length
        } characters). Maximum Characters needs to be > ${Math.round(text.length / 7)} (currently ${
          LLMParams.maxChars
        }). Make sure to choose a model that supports this size"`;
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
        console.log(`Command name: ${environment.commandName}`);
        showToast(text.length > LLMParams.maxChars ? LONG_TEXT : SUMMARIZING_TEXT);

        let finalSummary = "";
        // if we want final summary or have a short text, we use final summary
        if (environment.commandName === "summarizeLongText" || text.length < LLMParams.maxChars) {
          // Fetch summary from AI
          finalSummary = await getSummary(text, LLMParams);
        }
        // if we want the summaries of chunks without final summarization, we use block summaries
        if (environment.commandName === "summarizeBlocks") {
          finalSummary = await getBlockSummaries(text, LLMParams);
        }
        setSummary(finalSummary);

        showToast({
          ...SUCCESS_SUMMARIZING_TEXT,
          message: `tokens: ${getCharsAndTokens(finalSummary).tokens}, chars: ${getCharsAndTokens(finalSummary).chars}`,
        });
      } catch (error: unknown) {
        error instanceof Error && showToast({ ...ERROR_SUMMARIZING_TEXT, message: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [text]);

  return { summary, isLoading, prefMessage };
};

export default useAISummary;
