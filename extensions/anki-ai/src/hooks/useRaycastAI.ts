import { useState } from "react";
import { AI } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { Logger } from "../utils/logger";
import { getAIModelIdentifier } from "../constants/aiModels";

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
  if (options?.model) {
    // Primeiro tenta usar o mapeamento personalizado
    const modelId = getAIModelIdentifier(options.model);
    if (modelId) {
      try {
        // @ts-expect-error - Ignorando erro de tipagem pois os modelos podem não estar todos na definição de tipos
        modelOption = modelId;
      } catch (err) {
        Logger.warn(
          `Modelo não reconhecido pelo mapeamento personalizado: ${options.model}, tentando fallback para AI.Model`,
        );
      }
    }

    // Fallback para o método antigo se o mapeamento personalizado falhar
    if (!modelOption && options.model in AI.Model) {
      modelOption = AI.Model[options.model as keyof typeof AI.Model];
    }

    if (modelOption) {
      Logger.debug(`Usando modelo AI: ${options.model} (${modelOption})`);
    } else {
      Logger.warn(`Modelo AI não reconhecido: ${options.model}, usando modelo padrão`);
    }
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

  // Tentar fazer o parse da resposta como JSON
  if (data && !parsedData && !parseError) {
    try {
      // Limpar a resposta para garantir que é um JSON válido
      const cleanedJson = data
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanedJson) as T;
      setParsedData(parsed);
    } catch (err) {
      Logger.error("Erro ao fazer parse da resposta JSON:", err);
      setParseError(err as Error);
    }
  }

  return {
    data: parsedData,
    rawData: data,
    isLoading,
    error: error || parseError,
    revalidate,
  };
}
