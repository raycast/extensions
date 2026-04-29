import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getModel, setModel, type ClaudeModel } from "./storage";

const MODELS: { value: ClaudeModel; title: string; description: string }[] = [
  {
    value: "haiku",
    title: "Haiku",
    description: "Fast and efficient model for quick tasks",
  },
  {
    value: "sonnet",
    title: "Sonnet (Default)",
    description: "Balanced model for most development tasks",
  },
  {
    value: "opus",
    title: "Opus",
    description: "Most capable model for complex tasks",
  },
];

export default function ManageModel() {
  const [selectedModel, setSelectedModel] = useState<ClaudeModel>("sonnet");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setSelectedModel(await getModel());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSelect(model: ClaudeModel) {
    await setModel(model);
    await refresh();
    await showToast({
      style: Toast.Style.Success,
      title: "Model Updated",
      message: `Now using ${model}`,
    });
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Select Claude Model">
        {MODELS.map((model) => (
          <List.Item
            key={model.value}
            icon={
              selectedModel === model.value ? Icon.CheckCircle : Icon.Circle
            }
            title={model.title}
            subtitle={model.description}
            accessories={
              selectedModel === model.value ? [{ text: "Selected" }] : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Select Model"
                  icon={Icon.Check}
                  onAction={() => handleSelect(model.value)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
