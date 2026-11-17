import { getPreferenceValues } from "@raycast/api";
import fetch from "cross-fetch";
import OpenAI from "openai";
import { useState } from "react";
import { getConfigUrl } from "../utils";
import { getProxyAgent } from "./useProxy";

export function useChatGPT(): OpenAI {
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<Preferences>();
    const agent = getProxyAgent();

    return new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: getConfigUrl(preferences),
      // The SDK uses the global fetch, which ignores Node agents, so route requests through node-fetch.
      fetch: (url, init) => fetch(url as string, { ...init, agent } as RequestInit),
    });
  });
  return chatGPT;
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
