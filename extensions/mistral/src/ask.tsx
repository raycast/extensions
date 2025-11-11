import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Conversation } from "./components/conversation";
import { DEFAULT_MODEL_ID, FALLBACK_MODELS, type ModelId } from "./utils/models";

export default function Command() {
  const { push } = useNavigation();
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [question, setQuestion] = useState("");

  const modelName = FALLBACK_MODELS.find((m) => m.id === model)?.name || "Unknown";

  function handleSubmit() {
    if (!question.length) return;

    push(
      <Conversation
        conversation={{
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: question,
          date: new Date().toISOString(),
          chats: [{ question, answer: "" }],
        }}
        model={model}
      />,
    );
  }

  return (
    <List
      searchBarPlaceholder="Ask Mistral..."
      searchText={question}
      onSearchTextChange={setQuestion}
      actions={
        <ActionPanel>
          <Action title="Ask Mistral" icon={Icon.Message} onAction={handleSubmit} />
          <ActionPanel.Section title="🤖 Select Model">
            {FALLBACK_MODELS.map((m, index) => (
              <Action
                key={m.id}
                title={m.name}
                icon={model === m.id ? Icon.CheckCircle : Icon.Circle}
                onAction={() => setModel(m.id)}
                shortcut={{ modifiers: ["cmd", "shift"], key: (index + 1).toString() as "1" | "2" | "3" | "4" }}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon="mistral-icon.svg"
        title="Ask Mistral"
        description={`Type your message and hit enter\n\n🤖 ${modelName}`}
      />
    </List>
  );
}
