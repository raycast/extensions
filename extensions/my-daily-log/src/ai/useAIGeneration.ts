import { useCallback, useEffect, useRef, useState } from "react";
import { AIError, ChatMessage, generateText, getAIConfig, stripThinking } from "./llm";

export type AIGeneration = {
  text: string;
  isLoading: boolean;
  error?: Error;
  regenerate: () => void;
};

/** Streams the answer of the configured LLM for the given conversation. Pass `undefined` to skip the request. */
export function useAIGeneration(messages: ChatMessage[] | undefined): AIGeneration {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(messages !== undefined);
  const [error, setError] = useState<Error>();
  const [attempt, setAttempt] = useState(0);
  const messagesKey = JSON.stringify(messages ?? null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    const currentMessages = messagesRef.current;
    if (!currentMessages) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setText("");
    setError(undefined);
    setIsLoading(true);

    generateText(currentMessages, {
      config: getAIConfig(),
      signal: controller.signal,
      onText: (partial) => setText(stripThinking(partial)),
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setText(result);
          if (result.length === 0) {
            setError(new AIError("The model returned an empty answer. Try again or use another model."));
          }
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [messagesKey, attempt]);

  const regenerate = useCallback(() => setAttempt((value) => value + 1), []);

  return { text, isLoading, error, regenerate };
}
