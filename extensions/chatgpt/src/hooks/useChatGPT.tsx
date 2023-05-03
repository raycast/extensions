import { getPreferenceValues } from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";
import { useState } from "react";

export function useChatGPT(): OpenAIApi {
  const [chatGPT] = useState(() => {
    const apiKey = getPreferenceValues<{
      apiKey: string;
    }>().apiKey;

    const config = new Configuration({ apiKey });

    return new OpenAIApi(config);
  });

  return chatGPT;
}
