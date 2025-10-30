import { Action, ActionPanel, AI, Color, Detail, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { streamText, getProviderName } from "../utils/vercel-ai";

const LoadingIcons = [
  { source: Icon.StackedBars1, tintColor: Color.Blue },
  { source: Icon.StackedBars2, tintColor: Color.Blue },
  { source: Icon.StackedBars3, tintColor: Color.Blue },
  { source: Icon.StackedBars4, tintColor: Color.Blue },
];
const SuccessIcon = { source: Icon.CheckCircle, tintColor: Color.Green };
const ErrorIcon = { source: Icon.XMarkCircle, tintColor: Color.Red };

type Props = {
  prompt: string;
  provider: string;
  model: AI.Model;
  apiKey: string;
};

export default function ListItemVercel({ prompt, provider, model, apiKey }: Props) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % LoadingIcons.length);
    }, 200);
    return () => clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    let isCancelled = false;

    async function runStream() {
      setIsLoading(true);
      setError(null);
      setText("");

      try {
        const providerName = getProviderName(provider);

        if (!providerName) {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        const result = await streamText({
          provider: providerName,
          model: model as string,
          apiKey: apiKey,
          prompt: prompt,
        });

        for await (const textPart of result.textStream) {
          if (isCancelled) break;
          setText((prev) => prev + textPart);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    runStream();

    return () => {
      isCancelled = true;
    };
  }, [prompt, provider, model, apiKey]);

  return (
    <List.Item
      icon={error ? ErrorIcon : isLoading ? LoadingIcons[index] : SuccessIcon}
      title={provider}
      key={provider}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<Detail markdown={text} />} />
        </ActionPanel>
      }
      subtitle={model}
      detail={<List.Item.Detail markdown={error ? error : text} />}
    />
  );
}
