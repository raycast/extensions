import { Action, ActionPanel, Form, Icon, popToRoot, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getDefaultRuntimeSettings, loadRuntimeSettings, saveRuntimeSettings } from "./runtime-settings";
import { ModelTier, PromptProfile, RuntimeSettings, TranslationStyle } from "./types";

export default function Command() {
  const [settings, setSettings] = useState<RuntimeSettings>();
  const [isLoading, setIsLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    void loadRuntimeSettings().then((s) => {
      setSettings(s);
      setIsLoading(false);
    });
  }, []);

  async function handleSubmit(values: {
    modelTier: string;
    promptProfile: string;
    translationStyle: string;
    customPromptInstructions: string;
  }) {
    const updated: RuntimeSettings = {
      modelTier: values.modelTier as ModelTier,
      promptProfile: values.promptProfile as PromptProfile,
      translationStyle: values.translationStyle as TranslationStyle,
      customPromptInstructions: values.customPromptInstructions.trim().slice(0, 4000),
      ttsProvider: settings?.ttsProvider ?? "qwen",
    };

    await saveRuntimeSettings(updated);
    await showToast({ style: Toast.Style.Success, title: "Settings saved" });
    await popToRoot();
  }

  async function handleReset() {
    const defaults = getDefaultRuntimeSettings();
    await saveRuntimeSettings(defaults);
    setSettings(defaults);
    setFormKey((k) => k + 1);
    await showToast({ style: Toast.Style.Success, title: "Reset to defaults" });
  }

  if (!settings) {
    return <Form isLoading={isLoading} />;
  }

  return (
    <Form
      key={formKey}
      isLoading={isLoading}
      navigationTitle="Translation Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save" onSubmit={handleSubmit} />
          <Action
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            title="Reset to Defaults"
            onAction={() => void handleReset()}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="modelTier"
        title="Model Tier"
        defaultValue={settings.modelTier}
        info="Applies to translation. Rewrite & Coach always uses the Pro tier."
      >
        <Form.Dropdown.Item value="fast" title="Fast — Flash / Mini models, speed priority" icon={Icon.Bolt} />
        <Form.Dropdown.Item value="pro" title="Pro — Best models, quality priority" icon={Icon.Star} />
        <Form.Dropdown.Item value="custom" title="Custom — Use models set in Preferences" icon={Icon.Gear} />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown id="promptProfile" title="Prompt Profile" defaultValue={settings.promptProfile}>
        <Form.Dropdown.Item value="general" title="General Translation" />
        <Form.Dropdown.Item value="screenshot" title="Screenshot OCR" />
        <Form.Dropdown.Item value="technical" title="Technical / Developer" />
        <Form.Dropdown.Item value="academic" title="Academic Writing" />
        <Form.Dropdown.Item value="legal" title="Legal / Policy" />
        <Form.Dropdown.Item value="subtitle" title="Subtitle / Conversation" />
        <Form.Dropdown.Item value="custom" title="Custom Only" />
      </Form.Dropdown>

      <Form.Dropdown id="translationStyle" title="Translation Style" defaultValue={settings.translationStyle}>
        <Form.Dropdown.Item value="balanced" title="Balanced — Natural and accurate" />
        <Form.Dropdown.Item value="faithful" title="Faithful — Close to source wording" />
        <Form.Dropdown.Item value="polished" title="Polished — Fluent and idiomatic" />
        <Form.Dropdown.Item value="academic" title="Academic — Formal, precise prose" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        id="customPromptInstructions"
        title="Custom Instructions"
        placeholder="Optional: terminology, tone, audience, formatting..."
        defaultValue={settings.customPromptInstructions}
        info="Appended to every translation request. Max 4000 characters."
      />
    </Form>
  );
}
