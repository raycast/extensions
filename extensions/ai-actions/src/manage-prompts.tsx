import { ActionPanel, Action, List, Icon, useNavigation, Form, showToast, Toast, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";

interface AIPrompt {
  id: string;
  title: string;
  prompt: string;
  icon?: string;
  createdAt: number;
}

export default function Command() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    const stored = await LocalStorage.getItem<string>("ai-prompts");
    if (stored) {
      setPrompts(JSON.parse(stored));
    }
    setIsLoading(false);
  }

  async function savePrompts(newPrompts: AIPrompt[]) {
    await LocalStorage.setItem("ai-prompts", JSON.stringify(newPrompts));
    setPrompts(newPrompts);
  }

  async function deletePrompt(id: string) {
    if (
      await confirmAlert({
        title: "Delete Prompt",
        message: "Are you sure you want to delete this prompt?",
      })
    ) {
      const newPrompts = prompts.filter((p) => p.id !== id);
      await savePrompts(newPrompts);
      await showToast({ style: Toast.Style.Success, title: "Prompt deleted" });
    }
  }

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Create New Prompt"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Prompt"
              icon={Icon.Plus}
              target={<CreatePromptForm onSave={(prompt) => savePrompts([...prompts, prompt])} />}
            />
          </ActionPanel>
        }
      />
      {prompts.map((prompt) => (
        <List.Item
          key={prompt.id}
          title={prompt.title}
          subtitle={prompt.prompt.substring(0, 50) + "..."}
          icon={prompt.icon || Icon.Document}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Prompt"
                icon={Icon.Pencil}
                target={
                  <EditPromptForm
                    prompt={prompt}
                    onSave={(updated) => {
                      const newPrompts = prompts.map((p) => (p.id === updated.id ? updated : p));
                      savePrompts(newPrompts);
                    }}
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy Prompt ID"
                content={prompt.id}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Delete Prompt"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deletePrompt(prompt.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreatePromptForm({ onSave }: { onSave: (prompt: AIPrompt) => void }) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

  async function handleSubmit() {
    if (!title || !prompt) {
      await showToast({ style: Toast.Style.Failure, title: "Please fill all fields" });
      return;
    }

    const newPrompt: AIPrompt = {
      id: Date.now().toString(),
      title,
      prompt,
      icon: "✨",
      createdAt: Date.now(),
    };

    onSave(newPrompt);
    await showToast({ style: Toast.Style.Success, title: "Prompt created" });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Prompt" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="e.g., Translate to Chinese"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="prompt"
        title="Prompt Template"
        placeholder="Use {selection} for selected text&#10;&#10;Example:&#10;Translate to Traditional Chinese:&#10;&#10;{selection}"
        value={prompt}
        onChange={setPrompt}
      />
      <Form.Description text="Use {selection} as placeholder for the selected text" />
    </Form>
  );
}

function EditPromptForm({ prompt, onSave }: { prompt: AIPrompt; onSave: (prompt: AIPrompt) => void }) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(prompt.title);
  const [promptText, setPromptText] = useState(prompt.prompt);

  async function handleSubmit() {
    if (!title || !promptText) {
      await showToast({ style: Toast.Style.Failure, title: "Please fill all fields" });
      return;
    }

    const updated: AIPrompt = {
      ...prompt,
      title,
      prompt: promptText,
    };

    onSave(updated);
    await showToast({ style: Toast.Style.Success, title: "Prompt updated" });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Prompt title" value={title} onChange={setTitle} />
      <Form.TextArea
        id="prompt"
        title="Prompt Template"
        placeholder="Your prompt with {selection}"
        value={promptText}
        onChange={setPromptText}
      />
      <Form.Description text="Use {selection} as placeholder for the selected text" />
    </Form>
  );
}
