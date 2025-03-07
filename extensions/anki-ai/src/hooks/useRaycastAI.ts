import { useState } from "react";
import { AI } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { Logger } from "../utils/logger";

interface UseRaycastAIOptions {
  model?: string;
  creativity?: number;
  execute?: boolean;
}

/**
 * Hook personalizado para usar a AI do Raycast com opções adicionais
 * e tratamento de erro melhorado
 */
export function useRaycastAI(prompt: string, options?: UseRaycastAIOptions) {
  const [error, setError] = useState<Error | null>(null);

  // Determinar o modelo a ser usado
  let modelOption: AI.Model | undefined = undefined;
  if (options?.model && options.model in AI.Model) {
    modelOption = AI.Model[options.model as keyof typeof AI.Model];
  }

  // Usar o hook useAI do Raycast
  const { data, isLoading, revalidate } = useAI(prompt, {
    model: modelOption,
    creativity: options?.creativity || 1,
    execute: options?.execute !== undefined ? options.execute : true,
    onError: (err) => {
      Logger.error("Erro ao usar AI do Raycast:", err);
      setError(err);
    },
  });

  return {
    data,
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Hook para processar uma resposta JSON da AI
 */
export function useRaycastAIJson<T>(prompt: string, options?: UseRaycastAIOptions) {
  const { data, isLoading, error, revalidate } = useRaycastAI(prompt, options);
  const [parsedData, setParsedData] = useState<T | null>(null);
  const [parseError, setParseError] = useState<Error | null>(null);

  // Processar a resposta quando os dados chegarem
  useState(() => {
    if (data) {
      try {
        // Tenta extrair apenas o JSON se houver texto adicional
        const jsonMatch = data.match(/(\{.*\}|\[.*\])/s);
        const jsonString = jsonMatch ? jsonMatch[0] : data;

        const parsed = JSON.parse(jsonString) as T;
        setParsedData(parsed);
        setParseError(null);
      } catch (err) {
        Logger.error("Erro ao processar resposta JSON da AI:", err);
        setParseError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [data]);

  return {
    data: parsedData,
    rawData: data,
    isLoading,
    error: error || parseError,
    revalidate,
  };
}
