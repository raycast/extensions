import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { streamLLM } from "../ai";
import { addHistoryEntry } from "../storage";
import type { CommandType, ModelPreset } from "../types";

interface HistoryMeta {
  commandType: CommandType;
  commandLabel: string;
}

interface UseLLMOptions {
  preset: ModelPreset | undefined;
  systemPrompt: string;
  userPrompt: string;
  execute?: boolean;
  historyMeta?: HistoryMeta;
}

interface UseLLMResult {
  result: string;
  isLoading: boolean;
  error: Error | undefined;
}

export function useLLM(options: UseLLMOptions): UseLLMResult {
  const {
    preset,
    systemPrompt,
    userPrompt,
    execute = true,
    historyMeta,
  } = options;
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!execute || !preset || !userPrompt) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResult("");
    setIsLoading(true);
    setError(undefined);

    (async () => {
      try {
        const { textStream } = await streamLLM({
          preset,
          systemPrompt,
          userPrompt,
          abortSignal: controller.signal,
        });

        let accumulated = "";
        for await (const chunk of textStream) {
          if (controller.signal.aborted) break;
          accumulated += chunk;
          setResult((prev) => prev + chunk);
        }

        if (!controller.signal.aborted && accumulated && historyMeta) {
          addHistoryEntry({
            commandType: historyMeta.commandType,
            commandLabel: historyMeta.commandLabel,
            originalText: userPrompt,
            resultText: accumulated,
            modelPresetId: preset.id,
          }).catch(() => {});
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "LLM Error",
          message: error.message,
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [execute, systemPrompt, userPrompt, preset, historyMeta]);

  return { result, isLoading, error };
}
