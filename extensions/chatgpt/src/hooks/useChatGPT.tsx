import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { useState } from "react";
import { getConfigUrl } from "../utils";

export function useChatGPT(): OpenAI {
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<Preferences>();

    return new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: getConfigUrl(preferences),
    });
  });
  return chatGPT;
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
