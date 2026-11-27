import { getPreferenceValues } from "@raycast/api";
import fetch from "cross-fetch";
import OpenAI from "openai";
import { useState } from "react";
import { useProxy } from "./useProxy";

export function useChatGPT(): OpenAI {
  const agent = useProxy();
  const [chatGPT] = useState(() => {
    const preferences = getPreferenceValues<Preferences>();

    return new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: "https://api.cerebras.ai/v1",
      // The SDK uses the global fetch, which ignores Node agents, so route proxied requests through node-fetch.
      ...(agent && { fetch: (url, init) => fetch(url as string, { ...init, agent } as RequestInit) }),
    });
  });
  return chatGPT;
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
