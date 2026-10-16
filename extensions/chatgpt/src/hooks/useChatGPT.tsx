import { getPreferenceValues } from "@raycast/api";
import fetch from "cross-fetch";
import OpenAI from "openai";
import { useState } from "react";
import { getConfigUrl } from "../utils";
import { useProxy } from "./useProxy";

export function useChatGPT(): OpenAI {
  const httpAgent = useProxy();
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<Preferences>();

    return new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: getConfigUrl(preferences),
      fetch: (input, init) => fetch(input, { ...init, agent: httpAgent } as RequestInit),
    });
  });
  return chatGPT;
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
