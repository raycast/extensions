import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { useState } from "react";
import { getConfigUrl } from "../utils";

export function useOpenRouter(): OpenAI {
  const [openrouter] = useState(() => {
    const preferences = getPreferenceValues<Preferences>();

    return new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: getConfigUrl(preferences),
    });
  });
  return openrouter;
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
