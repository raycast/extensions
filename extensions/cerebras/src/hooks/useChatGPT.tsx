import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { useState } from "react";

export function useChatGPT(): OpenAI {
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<Preferences>();

    return new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: "https://api.cerebras.ai/v1",
    });
  });
  return chatGPT;
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
