import { useEffect, useState } from "react";
import { OpenAI, OpenAIConfig, generateMessages } from "../utils";
import { useHistories } from "./useHistories";
import { ChatCompletionRequestMessage } from "openai";
import { IncomingMessage } from "node:http";

interface Options {
  model: string;
}

interface UseOpenAIConfig extends OpenAIConfig, Options {}

export default function useOpenAI(config: UseOpenAIConfig, prompt: string) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { histories } = useHistories();

  const client = OpenAI(config);

  const messages: ChatCompletionRequestMessage[] = generateMessages(histories, prompt);

  useEffect(() => {
    (async () => {
      if (!prompt) return;
      setIsLoading(true);
      setContent("");

      const events = await client.createChatCompletion(
        {
          model: config.model,
          messages,
          stream: true,
        },
        {
          responseType: "stream",
        }
      );

      const stream = events.data as unknown as IncomingMessage;

      stream.on("data", (data: { toString: () => string }) => {
        const lines = data
          .toString()
          .split("\n")
          .filter((line) => line.trim() !== "");
        for (const line of lines) {
          const message = line.replace(/^data: /, "");
          if (message === "[DONE]") {
            return; // Stream finished
          }
          try {
            const parsed = JSON.parse(message);
            setContent((x) => x + parsed.choices[0].delta.content);
          } catch (error) {
            // console.error('Could not JSON parse stream message', message, error);
          }
        }
      });

      setIsLoading(false);
    })();
  }, [prompt]);

  return { content, isLoading };
}
