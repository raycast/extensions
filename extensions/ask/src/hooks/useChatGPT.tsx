import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { useState } from "react";
import { ConfigurationPreferences } from "../type";

export function useChatGPT(): OpenAI {
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<ConfigurationPreferences>();

    return new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: preferences.apiEndpoint,
    });
  });
  return chatGPT;
}
