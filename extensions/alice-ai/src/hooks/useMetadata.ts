import { GPTTokens } from "gpt-tokens";
import { ChatCompletionMessageParam } from "openai/resources";
import { useEffect, useState } from "react";
import { Model } from "../lib/OpenAI";

interface ResultMetadata {
  promptTokens: number;
  resultTokens: number;
  totalTokens: number;
  cost: number;
}

export default function useMetadata(messages: ChatCompletionMessageParam[], model: Model): ResultMetadata {
  const [metadata, setMetadata] = useState<ResultMetadata>({
    promptTokens: 0,
    resultTokens: 0,
    totalTokens: 0,
    cost: 0,
  });

  useEffect(() => {
    if (messages.length > 0 && model) {
      const usage = new GPTTokens({
        model: model as GPTTokens["model"],
        messages: messages as GPTTokens["messages"],
      });

      setMetadata({
        promptTokens: usage.promptUsedTokens,
        resultTokens: usage.completionUsedTokens,
        totalTokens: usage.usedTokens,
        cost: usage.usedUSD,
      });
    }
  }, [messages, model]);

  return metadata;
}
