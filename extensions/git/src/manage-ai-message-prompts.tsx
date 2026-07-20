import { ActionPanel, Action, Icon, List, Form, useNavigation, confirmAlert, Alert, AI, Color } from "@raycast/api";
import { useState } from "react";
import { useAiPromptPresets, AiPromptPreset } from "./hooks/useAiPromptPresets";

export default function ManageAiMessagePrompts() {
  const { defaultPreset, otherPresets, deletePreset, setDefault } = useAiPromptPresets();

  return (
    <List
      navigationTitle="AI Message Prompts"
      searchBarPlaceholder="Search presets by name..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Preset"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<AiMessagePresetEditorForm />}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Default Preset">
        <PresetListItem preset={defaultPreset} isDefault={true} />
      </List.Section>

      <List.Section title="Other Presets">
        {otherPresets.map((preset) => (
          <PresetListItem
            key={preset.id}
            preset={preset}
            isDefault={false}
            onDelete={() => deletePreset(preset.id)}
            onSetDefault={() => setDefault(preset.id)}
          />
        ))}
        <List.Item
          title="Add New Preset"
          icon={{ source: Icon.Plus, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <AddNewPresetAction />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function PresetListItem({
  preset,
  isDefault,
  onDelete,
  onSetDefault,
}: {
  preset: AiPromptPreset;
  isDefault: boolean;
  onDelete?: () => void;
  onSetDefault?: () => void;
}) {
  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Preset",
      message: `Are you sure you want to delete preset "${preset.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      onDelete?.();
    }
  };

  return (
    <List.Item
      icon={preset.icon ? preset.icon : { source: Icon.Message, tintColor: Color.SecondaryText }}
      title={preset.name}
      accessories={[{ text: preset.model ? preset.model.replaceAll("_", " ") : "Auto" }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={preset.name}>
            {!isDefault && <Action title="Set as Default" icon={Icon.Star} onAction={onSetDefault} />}
            <Action.Push
              title="Edit Preset"
              icon={Icon.Pencil}
              target={<AiMessagePresetEditorForm initialPreset={preset} />}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.Push
              title="Duplicate Preset"
              icon={Icon.Duplicate}
              target={
                <AiMessagePresetEditorForm
                  initialPreset={{
                    ...preset,
                    id: undefined,
                    name: `${preset.name} copy`,
                  }}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            {!isDefault && (
              <Action
                title="Delete Preset"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleDelete}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            )}
          </ActionPanel.Section>
          <AddNewPresetAction />
        </ActionPanel>
      }
    />
  );
}

function AddNewPresetAction() {
  return (
    <Action.Push
      title="Add New Preset"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<AiMessagePresetEditorForm />}
    />
  );
}

export function AiMessagePresetEditorForm({ initialPreset }: { initialPreset?: Partial<AiPromptPreset> }) {
  const { pop } = useNavigation();
  const { addPreset, updatePreset } = useAiPromptPresets();
  const [name, setName] = useState(`${initialPreset?.icon ?? ""} ${initialPreset?.name ?? ""}`.trim());
  const [prompt, setPrompt] = useState(initialPreset?.prompt ?? "");
  const [model, setModel] = useState<string>(initialPreset?.model ?? "auto");

  const handleSubmit = (values: { name: string; prompt: string; model: string }) => {
    const aiModel = values.model === "auto" ? undefined : values.model;
    if (initialPreset?.id) {
      updatePreset(initialPreset.id, values.name.trim(), values.prompt.trim(), aiModel);
    } else {
      addPreset(values.name.trim(), values.prompt.trim(), aiModel);
    }
    pop();
  };

  return (
    <Form
      navigationTitle={initialPreset ? `Edit Preset` : "Add Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initialPreset ? "Save Changes" : "Create Preset"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., Conventional Commits"
        value={name}
        error={name.trim().length === 0 ? "Required" : undefined}
        onChange={setName}
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Write system prompt for AI commit generation..."
        value={prompt}
        error={prompt.trim().length === 0 ? "Required" : undefined}
        onChange={setPrompt}
      />

      <Form.Dropdown id="model" title="AI Model" value={model ?? "auto"} onChange={setModel}>
        <Form.Dropdown.Item value={"auto"} title="Auto" />
        {Object.keys(AI.Model).map((model) => (
          <Form.Dropdown.Item key={model} title={model.replaceAll("_", " ")} value={model} />
        ))}
      </Form.Dropdown>

      <Form.Description text="Prompt is used to generate commit message based on diff content. It will be available via 'Generate Commit Message' action in Commit Message Form." />
    </Form>
  );
}
