import { useEffect, useState } from "react";
import { AzureOpenAI, generateMessages } from "../utils";
import { useHistories } from "./useHistories";
import { getPreferenceValues } from "@raycast/api";

export interface AppPreference {
  endpoint: string;
  apiKey: string;
  deployment: string;
  systemPrompt: string;
}

const appPreference = getPreferenceValues<AppPreference>();

export function useAzureOpenAI(prompt: string) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { histories } = useHistories();

  const messages = generateMessages(histories, prompt);

  const client = AzureOpenAI({
    endpoint: appPreference.endpoint,
    apiKey: appPreference.apiKey,
  });

  useEffect(() => {
    (async () => {
      if (!prompt) return;
      setIsLoading(true);
      setContent("");

      const events = await client.listChatCompletions(appPreference.deployment, messages);

      for await (const event of events) {
        for (const choice of event.choices) {
          setContent((x) => x + (choice.delta?.content || ""));
        }
      }
      setIsLoading(false);
    })();
  }, [prompt]);

  return { content, isLoading };
}
