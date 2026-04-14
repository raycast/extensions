import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { CustomPromptForm, resolveIcon } from "./components/custom-prompt-form";
import { ensureDefaults } from "./defaults";
import {
  deleteCustomPrompt,
  getCustomPrompts,
  getModelPreset,
} from "./storage";
import type { CustomPrompt } from "./types";

export default function ManageCustomPrompts() {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [presetNames, setPresetNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadPrompts = useCallback(async () => {
    await ensureDefaults();
    const data = await getCustomPrompts();
    setPrompts(data);

    const names: Record<string, string> = {};
    for (const p of data) {
      if (!names[p.modelPresetId]) {
        const preset = await getModelPreset(p.modelPresetId);
        names[p.modelPresetId] = preset?.name ?? "Unknown";
      }
    }
    setPresetNames(names);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  async function handleDelete(prompt: CustomPrompt) {
    if (
      await confirmAlert({
        title: `Delete "${prompt.name}"?`,
        message: "This cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await deleteCustomPrompt(prompt.id);
      await showToast({ style: Toast.Style.Success, title: "Prompt deleted" });
      await loadPrompts();
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Custom Prompts">
      {prompts.map((prompt) => (
        <List.Item
          key={prompt.id}
          title={prompt.name}
          subtitle={
            prompt.prompt.slice(0, 60) +
            (prompt.prompt.length > 60 ? "..." : "")
          }
          accessories={[
            { text: `Model: ${presetNames[prompt.modelPresetId] ?? "..."}` },
          ]}
          icon={resolveIcon(prompt.icon)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                target={
                  <CustomPromptForm
                    customPrompt={prompt}
                    onSave={loadPrompts}
                  />
                }
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(prompt)}
              />
              <Action.Push
                title="Create New"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CustomPromptForm onSave={loadPrompts} />}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title="Create New Prompt"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create"
              target={<CustomPromptForm onSave={loadPrompts} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
