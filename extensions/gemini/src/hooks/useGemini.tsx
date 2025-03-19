import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { useState } from "react";
import { getConfigUrl } from "../utils";

export function useGemini(): OpenAI {
  const [gemini] = useState(() => {
    const preferences = getPreferenceValues<Preferences>();

    return new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: getConfigUrl(preferences),
    });
  });
  return gemini;
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
