import { Configuration, OpenAIApi, Model } from "openai";
import { useCallback, useRef, useState } from "react";

import type { CreateCompletionRequest, CreateCompletionResponseChoicesInner } from "openai";

export type ChoicesResponse = {
  choices?: CreateCompletionResponseChoicesInner[];
  error?: Error;
};

export default function useOpenAICompletionApi(config: { apiKey: string }) {
  const [choices, setChoices] = useState<ChoicesResponse>({});
  const [models, setModels] = useState<Model[]>();
  const [isLoading, setIsLoading] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);

  const openai = new OpenAIApi(config as Configuration);

  const createCompletion = useCallback(
    async function createCompletion(requestOpt: CreateCompletionRequest) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      try {
        const { data } = await openai.createCompletion(requestOpt, {
          // There's a bug in the openai library where the auth header isn't being set
          // Set it manually here instead
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: cancelRef.current.signal,
        });

        setChoices({ choices: data.choices });
      } catch (e) {
        const error = e as any;
        if (error.response) {
          setChoices({ error: new Error(`${error.response.status}: ${error.response.data.error.message}`) });
        } else {
          setChoices({ error: error.message });
        }
      }

      setIsLoading(false);

      return () => {
        cancelRef.current?.abort();
      };
    },
    [choices, cancelRef]
  );

  const listModels = useCallback(
    async function listModels(filterBy?: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      try {
        const { data } = await openai.listModels({
          // There's a bug in the openai library where the auth header isn't being set
          // Set it manually here instead
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: cancelRef.current.signal,
        });

        setModels(data.data.filter(({ id, owned_by }) => id.includes(":ft")).sort((a, b) => a.created - b.created));
      } catch (e) {
        const error = e as any;
        if (error.response) {
          setChoices({ error: new Error(`${error.response.status}: ${error.response.data.error.message}`) });
        } else {
          setChoices({ error: error.message });
        }
      }

      setIsLoading(false);

      return () => {
        cancelRef.current?.abort();
      };
    },
    [choices, cancelRef]
  );

  return [choices, createCompletion, models, listModels, isLoading] as const;
}

export type PreferredModel = { id: string; description: string; max: number };
export const PREFERRED_MODELS: PreferredModel[] = [
  {
    id: "text-davinci-003",
    description:
      "Most capable GPT-3 model. Can do any task the other models can do, often with less context. In addition to responding to prompts, also supports inserting completions within text.",
    max: 4000,
  },
  {
    id: "text-curie-001",
    description: "Very capable, but faster and lower cost than Davinci.",
    max: 2048,
  },
  {
    id: "text-babbage-001",
    description: "Capable of straightforward tasks, very fast, and lower cost.",
    max: 2048,
  },
  {
    id: "text-ada-001",
    description: "Capable of very simple tasks, usually the fastest model in the GPT-3 series, and lowest cost.",
    max: 2048,
  },
];
