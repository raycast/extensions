import { List, ActionPanel, Action } from "@raycast/api";

interface ModelListProps {
  models: string[];
  isLoading: boolean;
  onSelect: (model: string) => void;
}

export function ModelList({ models, isLoading, onSelect }: ModelListProps) {
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a model to generate mind map">
      {models.map((model) => (
        <List.Item
          key={model}
          title={model}
          icon={{ source: model.includes("gemma") ? "🤖" : "🧠" }}
          accessories={[{ text: "Generate Mind Map", icon: "🗺️" }]}
          actions={
            <ActionPanel>
              <Action
                title="Generate Mind Map"
                icon="🗺️"
                onAction={() => onSelect(model)}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
