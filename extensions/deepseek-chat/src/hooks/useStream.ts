import { useState, useCallback, useRef } from "react";
import { streamChat } from "../api/deepseek";

type StreamStatus = "idle" | "streaming" | "done" | "error";

interface Preferences {
  apiKey: string;
  model: "deepseek-chat" | "deepseek-reasoner";
}

export function useStream(preferences: Preferences) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const rejectRef = useRef<((reason: Error) => void) | null>(null);

  const submit = useCallback(
    (question: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const controller = new AbortController();
        abortRef.current = controller;
        rejectRef.current = reject;
        setText("");
        setStatus("streaming");

        streamChat({
          prompt: question,
          model: preferences.model,
          apiKey: preferences.apiKey,
          signal: controller.signal,
          onChunk: (fullText) => setText(fullText),
          onComplete: (fullText) => {
            setStatus("done");
            abortRef.current = null;
            rejectRef.current = null;
            resolve(fullText);
          },
          onError: (error) => {
            setStatus("error");
            abortRef.current = null;
            rejectRef.current = null;
            reject(error);
          },
        }).catch(() => {});
      });
    },
    [preferences],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    rejectRef.current?.(new Error("Cancelled"));
    rejectRef.current = null;
    setStatus("idle");
  }, []);

  const reset = useCallback(() => {
    setText("");
    setStatus("idle");
  }, []);

  return { text, status, submit, cancel, reset };
}
