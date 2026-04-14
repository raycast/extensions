import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ensureDefaults } from "../defaults";
import { getModelPresets, saveCustomPrompt } from "../storage";
import type { CustomPrompt, ModelPreset } from "../types";

const ICON_OPTIONS: { value: string; title: string; icon: Icon }[] = [
  { value: "", title: "Default (Document)", icon: Icon.Document },
  { value: "BulletPoints", title: "Bullet Points", icon: Icon.BulletPoints },
  { value: "Building", title: "Building", icon: Icon.Building },
  { value: "Book", title: "Book", icon: Icon.Book },
  { value: "Code", title: "Code", icon: Icon.Code },
  { value: "Envelope", title: "Envelope", icon: Icon.Envelope },
  { value: "Globe", title: "Globe", icon: Icon.Globe },
  { value: "Hammer", title: "Hammer", icon: Icon.Hammer },
  { value: "LightBulb", title: "Light Bulb", icon: Icon.LightBulb },
  { value: "Pencil", title: "Pencil", icon: Icon.Pencil },
  { value: "Star", title: "Star", icon: Icon.Star },
  { value: "TextCursor", title: "Text Cursor", icon: Icon.TextCursor },
  { value: "Wand", title: "Wand", icon: Icon.Wand },
];

export function resolveIcon(iconName?: string): Icon {
  if (!iconName) return Icon.Document;
  return (
    ICON_OPTIONS.find((opt) => opt.value === iconName)?.icon ?? Icon.Document
  );
}

interface FormValues {
  name: string;
  prompt: string;
  modelPresetId: string;
  icon: string;
}

interface CustomPromptFormProps {
  customPrompt?: CustomPrompt;
  onSave: () => void;
}

export function CustomPromptForm({
  customPrompt,
  onSave,
}: CustomPromptFormProps) {
  const { pop } = useNavigation();
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureDefaults();
      const loadedPresets = await getModelPresets();
      setPresets(loadedPresets);
      setIsReady(true);
    })();
  }, []);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      await saveCustomPrompt({
        id: customPrompt?.id,
        name: values.name,
        prompt: values.prompt,
        modelPresetId: values.modelPresetId,
        icon: values.icon || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: customPrompt ? "Prompt updated" : "Prompt created",
      });
      onSave();
      pop();
    },
    initialValues: {
      name: customPrompt?.name ?? "",
      prompt: customPrompt?.prompt ?? "",
      modelPresetId: customPrompt?.modelPresetId ?? "",
      icon: customPrompt?.icon ?? "",
    },
    validation: {
      name: FormValidation.Required,
      prompt: FormValidation.Required,
      modelPresetId: FormValidation.Required,
    },
  });

  if (!isReady) return <Detail isLoading />;

  return (
    <Form
      navigationTitle={customPrompt ? "Edit Prompt" : "Create Prompt"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={customPrompt ? "Update" : "Create"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="e.g. Summarize, Business Tone"
        {...itemProps.name}
      />
      <Form.TextArea
        title="Prompt"
        placeholder="System prompt for the LLM..."
        {...itemProps.prompt}
      />
      <Form.Dropdown title="Model Preset" {...itemProps.modelPresetId}>
        {presets.map((p) => (
          <Form.Dropdown.Item
            key={p.id}
            value={p.id}
            title={`${p.name} (${p.provider}/${p.model})`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {ICON_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            value={opt.value}
            title={opt.title}
            icon={opt.icon}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
