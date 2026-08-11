import { useState, useEffect, useRef } from "react";
import OpenAI from "openai";
import { getPreferenceValues } from "@raycast/api";

const OPENAI_MODEL = "gpt-4o-mini";

export function useOpenAIStreaming(prompt: string, execute: boolean) {
  const [data, setData] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    let isCancelled = false;

    if (!prompt || !execute) return;
    setIsLoading(true);
    setError(null);
    setData("");

    const openai = new OpenAI({
      apiKey: preferences.openAIApiKey,
    });

    abortControllerRef.current = new AbortController();

    const fetchStream = async () => {
      try {
        const stream = await openai.chat.completions.create(
          {
            model: OPENAI_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            stream: true,
          },
          { signal: abortControllerRef.current?.signal },
        );

        for await (const chunk of stream) {
          if (isCancelled) break;
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            setData((result) => result + content);
          }
        }
      } catch (err) {
        if (!isCancelled && !(err instanceof Error && err.name === "AbortError")) {
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
      abortControllerRef.current?.abort();
    };
  }, [prompt, execute]);

  return { data, isLoading, error };
}
