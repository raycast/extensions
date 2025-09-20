import { useState, useEffect } from "react";
import OpenAI from "openai";
import { getPreferenceValues } from "@raycast/api";

const OPENAI_MODEL = "gpt-4o-mini";

export function useOpenAIStreaming(prompt: string, execute: boolean) {
  const [data, setData] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const preferences = getPreferenceValues<Preferences>();
  const openai = new OpenAI({
    apiKey: preferences.openAIApiKey,
  });

  useEffect(() => {
    let isCancelled = false;

    if (!prompt || !execute) return;
    setIsLoading(true);
    setError(null);
    setData("");

    const fetchStream = async () => {
      try {
        const chatCompletion = openai.beta.chat.completions.stream({
          model: OPENAI_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
        });

        if (isCancelled) {
          chatCompletion.abort();
          return;
        }

        chatCompletion.on("content", (delta) => {
          if (isCancelled) return;
          setData((result) => {
            if (!delta) return result;
            return result + delta;
          });
        });

        await chatCompletion.finalChatCompletion();
      } catch (err) {
        if (!isCancelled) {
          console.error("OpenAI API Error:", err);
          setError(err instanceof Error ? err : new Error("An error occurred with the OpenAI API: " + err));
        }
      } finally {
        // Checking isCancelled because multiple requests may be executed simultaneously
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchStream();

    return () => {
      isCancelled = true;
    };
  }, [prompt, execute]);

  return { data, isLoading, error };
}
