import { List, ActionPanel, Action, Form, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { addMemory } from "./utils";
import { useClipboardText } from "./hooks";
import { MemoryResult, Preferences } from "./types";

export default function Command() {
  const { mem0ApiKey, defaultUserId } = getPreferenceValues<Preferences>();
  const { clipboardText, isLoading: clipboardLoading } = useClipboardText();
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  async function handleAddMemory(text: string) {
    setIsLoading(true);
    try {
      const memoryResults = await addMemory(mem0ApiKey, text, defaultUserId);
      setResults(memoryResults);
      setIsEditing(false);
    } catch (error) {
      void error;
      showFailureToast("Failed to store in Mem0", {
        primaryAction: {
          title: "Retry",
          onAction: () => handleAddMemory(clipboardText),
        },
      });
    }
    setIsLoading(false);
  }

  if (isEditing) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save to Mem0"
              onSubmit={(values: { text: string }) => handleAddMemory(values.text)}
            />
            <Action
              title="Cancel"
              onAction={() => setIsEditing(false)}
              shortcut={{ modifiers: ["cmd"], key: "escape" }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="text" title="Memory Text" defaultValue={clipboardText} enableMarkdown />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading || clipboardLoading}>
      <List.Section title="Original Text">
        <List.Item
          title={clipboardText}
          actions={
            <ActionPanel>
              <Action title="Add to Mem0" onAction={() => handleAddMemory(clipboardText)} />
              <Action
                title="Edit Text"
                onAction={() => setIsEditing(true)}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Extracted Memories">
        {results.map((result, index) => (
          <List.Item key={index} title={result.memory} accessories={[{ text: result.event || "" }]} />
        ))}
      </List.Section>
    </List>
  );
}
