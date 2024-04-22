import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { useState } from "react";

export function usePPLX(): OpenAI {
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<Preferences>();

    return new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: "https://api.perplexity.ai",
    });
  });
  return chatGPT;
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
