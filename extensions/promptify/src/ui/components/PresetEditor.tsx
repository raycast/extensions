import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation, Detail } from "@raycast/api";
import { useState } from "react";
import { PresetConfig } from "../../core/types";
import { usePresetEditor } from "../hooks/usePresets";

interface PresetEditorProps {
  preset?: PresetConfig;
  onSave?: (preset: PresetConfig) => void;
  onCancel?: () => void;
}

export function PresetEditor({ preset, onSave, onCancel }: PresetEditorProps) {
  const { pop } = useNavigation();
  const [showPreview, setShowPreview] = useState(false);

  const { preset: editingPreset, updateField, validation, isDirty, preview, save, reset } = usePresetEditor(preset);

  const handleSave = async () => {
    const success = await save();
    if (success) {
      onSave?.(editingPreset as PresetConfig);
      pop();
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      showToast(Toast.Style.Failure, "Unsaved changes will be lost");
    }
    onCancel?.();
    pop();
  };

  const handleTest = () => {
    if (!editingPreset.systemPrompt) {
      showToast(Toast.Style.Failure, "Add a system prompt to test");
      return;
    }
    setShowPreview(true);
  };

  if (showPreview) {
    return (
      <Detail
        markdown={`# Preview: ${editingPreset.name || "Untitled Preset"}

        ${editingPreset.description ? `*${editingPreset.description}*` : ""}

        ## Rendered System Prompt

        \`\`\`
        ${preview}
        \`\`\`

        ## Sample Inputs Used
        - input: "Sample input text"
        - topic: "example topic"  
        - style: "professional"

        ${!validation.valid ? `\n## ⚠️ Validation Errors\n${validation.errors.map((e: string) => `- ${e}`).join("\n")}` : ""}
        `}
        actions={
          <ActionPanel>
            <Action title="Back to Editor" icon={Icon.ArrowLeft} onAction={() => setShowPreview(false)} />
            <Action
              title="Save Preset"
              icon={Icon.Check}
              onAction={handleSave}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Preset Actions">
            <Action
              title="Save Preset"
              icon={Icon.Check}
              onAction={handleSave}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action
              title="Test Preview"
              icon={Icon.Eye}
              onAction={handleTest}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Navigation">
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={handleCancel}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            />
            {isDirty && (
              <Action
                title="Reset Changes"
                icon={Icon.Undo}
                onAction={reset}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset Name"
        placeholder="Enter preset name..."
        value={editingPreset.name || ""}
        onChange={(value) => updateField("name", value)}
        error={!editingPreset.name ? "Name is required" : undefined}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Describe what this preset does..."
        value={editingPreset.description || ""}
        onChange={(value) => updateField("description", value)}
      />

      <Form.TagPicker
        id="tags"
        title="Tags"
        placeholder="Add tags..."
        value={editingPreset.tags || []}
        onChange={(value) => updateField("tags", value)}
      >
        <Form.TagPicker.Item value="general" title="General" />
        <Form.TagPicker.Item value="coding" title="Coding" />
        <Form.TagPicker.Item value="creative" title="Creative" />
        <Form.TagPicker.Item value="analysis" title="Analysis" />
        <Form.TagPicker.Item value="writing" title="Writing" />
        <Form.TagPicker.Item value="research" title="Research" />
      </Form.TagPicker>

      <Form.TextArea
        id="systemPrompt"
        title="System Prompt Template"
        placeholder={`Enter your prompt template. Use {{input}} for user input and other placeholders as needed.

        Example:
        You are an expert {{topic|writing}} assistant. 
        Please help with: {{input}}
        Style: {{style|professional}}`}
        value={editingPreset.systemPrompt || ""}
        onChange={(value) => updateField("systemPrompt", value)}
        error={!editingPreset.systemPrompt ? "System prompt is required" : undefined}
        info="Must include {{input}} placeholder where user input will be inserted. Add other placeholders with {{key}} or {{key|default}} format."
      />

      <Form.Separator />

      <Form.Description
        title="Validation"
        text={validation.valid ? "✅ Preset is valid and ready to save" : `❌ Issues: ${validation.errors.join(", ")}`}
      />

      <Form.Description
        title="Placeholders Found"
        text={(() => {
          const placeholders = extractPlaceholders(editingPreset.systemPrompt || "");
          const hasInput = placeholders.includes("input");

          if (placeholders.length === 0) {
            return "⚠️ No placeholders detected. Must include {{input}} for user input.";
          }

          if (!hasInput) {
            return `⚠️ Missing {{input}} placeholder! Found: ${placeholders.join(", ")}`;
          }

          return `✅ Found: ${placeholders.join(", ")}`;
        })()}
      />

      {isDirty && <Form.Description title="Status" text="⚠️ You have unsaved changes" />}
    </Form>
  );
}

// Extract placeholder names from template
function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{\{\s*([^}|]+)(?:\|[^}]+)?\s*\}\}/g) || [];
  return [
    ...new Set(
      matches.map((match) => {
        const cleaned = match.replace(/\{\{\s*|\s*\}\}/g, "");
        return cleaned.split("|")[0].trim();
      }),
    ),
  ];
}

// Quick preset creation form for common use cases
export function QuickPresetCreator({ onSave }: { onSave?: (preset: PresetConfig) => void }) {
  const [template] = useState<"general" | "coding" | "creative" | "custom">("general");

  const templates = {
    general: {
      name: "Quick General Preset",
      description: "General purpose enhancement preset",
      systemPrompt: `You are a helpful assistant. Please help with: {{input}}

      Style: {{style|professional}}
      Format: {{format|clear and concise}}`,
      tags: ["general", "quick"],
    },
    coding: {
      name: "Quick Coding Preset",
      description: "Code assistance preset",
      systemPrompt: `You are a coding expert in {{language|JavaScript}}.

      Task: {{input}}
      Code style: {{style|clean and readable}}
      Include: {{include|comments and examples}}`,
      tags: ["coding", "quick"],
    },
    creative: {
      name: "Quick Creative Preset",
      description: "Creative writing preset",
      systemPrompt: `You are a creative writer specializing in {{genre|general writing}}.

      Task: {{input}}
      Tone: {{tone|engaging}}
      Length: {{length|medium}}`,
      tags: ["creative", "writing", "quick"],
    },
    custom: {
      name: "",
      description: "",
      systemPrompt: "",
      tags: [],
    },
  };

  return <PresetEditor preset={templates[template] as PresetConfig} onSave={onSave} />;
}
