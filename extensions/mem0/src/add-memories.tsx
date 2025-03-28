import { Clipboard, List, ActionPanel, Action, Form, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";

const API_BASE_URL = "https://api.mem0.ai/v1/memories/";

interface MemoryResult {
  memory: string;
  event: string;
}

interface ApiResponse {
  results?: MemoryResult[];
}

interface Preferences {
  mem0ApiKey: string;
  defaultUserId: string;
}

export default function Command() {
  const { mem0ApiKey, defaultUserId } = getPreferenceValues<Preferences>();
  const [clipboardText, setClipboardText] = useState<string>("");
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function getClipboardContent() {
      try {
        const text = await Clipboard.readText();
        if (text) {
          setClipboardText(text);
        } else {
          setClipboardText("Clipboard is empty");
        }
      } catch (error) {
        setClipboardText("Failed to read clipboard");
      } finally {
        setIsLoading(false);
      }
    }
    getClipboardContent();
  }, []);

  async function handleAddMemory(text: string) {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${mem0ApiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: text,
            },
          ],
          user_id: defaultUserId,
          output_format: "v1.1",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as ApiResponse;
      setResults(data.results || []);
      setIsEditing(false);
    } catch (error) {
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
    <List isLoading={isLoading}>
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
          <List.Item key={index} title={result.memory} accessories={[{ text: result.event }]} />
        ))}
      </List.Section>
    </List>
  );
}
