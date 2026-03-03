import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { useState } from "react";
import { getConfigUrl } from "../utils";

interface UseChatGPTOptions {
  allowMissingApiKey?: boolean;
}

export function useChatGPT(options?: { allowMissingApiKey?: false }): OpenAI;
export function useChatGPT(options: { allowMissingApiKey: true }): OpenAI | null;
export function useChatGPT(options: UseChatGPTOptions = {}): OpenAI | null {
  const { allowMissingApiKey = false } = options;
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<Preferences>();
    const apiKey = (preferences.apiKey ?? "").trim();

    if (!apiKey) {
      if (allowMissingApiKey) {
        return null;
      }
      throw new Error("OpenAI API key is missing. Add it in extension preferences.");
    }

    return new OpenAI({
      apiKey,
      baseURL: getConfigUrl(preferences),
    });
  });
  return chatGPT;
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
