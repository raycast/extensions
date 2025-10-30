import { Action, ActionPanel, AI, Color, Detail, Icon, List } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useEffect, useState } from "react";

const LoadingIcons = [
  { source: Icon.StackedBars1, tintColor: Color.Blue },
  { source: Icon.StackedBars2, tintColor: Color.Blue },
  { source: Icon.StackedBars3, tintColor: Color.Blue },
  { source: Icon.StackedBars4, tintColor: Color.Blue },
];
const SuccessIcon = { source: Icon.CheckCircle, tintColor: Color.Green };
const ErrorIcon = { source: Icon.XMarkCircle, tintColor: Color.Red };

type Props = { prompt: string; provider: string; model: AI.Model };
export default function ListItem({ prompt, provider, model }: Props) {
  const [index, setIndex] = useState(0);

  const { data, isLoading, error } = useAI(prompt, {
    model: model,
    stream: true,
  });

  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % LoadingIcons.length);
    }, 200);
    return () => clearInterval(timer);
  }, [isLoading]);

  return (
    <List.Item
      icon={error ? ErrorIcon : isLoading ? LoadingIcons[index] : SuccessIcon}
      title={provider}
      key={provider}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<Detail markdown={data} />} />
        </ActionPanel>
      }
      subtitle={model}
      detail={<List.Item.Detail markdown={error ? error.message : data} />}
    />
  );
}
