import { Action, ActionPanel, Form, Icon, popToRoot, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getOrderedProviderIds, PROVIDER_TITLES, readPreferences } from "./preferences";
import { getDefaultRuntimeSettings, loadRuntimeSettings, saveRuntimeSettings } from "./runtime-settings";
import { getDefaultTTSModel, getTTSModelOptions, TTS_PROVIDER_LABELS } from "./tts-models";
import {
  ModelTier,
  PromptProfile,
  ProviderId,
  ProviderSelectionMode,
  RuntimeSettings,
  TranslationStyle,
  TTSProvider,
} from "./types";

export default function Command() {
  const preferences = useMemo(() => readPreferences(), []);
  const providerIds = useMemo(() => getOrderedProviderIds(preferences), [preferences]);
  const [settings, setSettings] = useState<RuntimeSettings>();
  const [isLoading, setIsLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("qwen");

  useEffect(() => {
    void loadRuntimeSettings().then((s) => {
      setSettings(s);
      setTtsProvider(s.ttsProvider);
      setIsLoading(false);
    });
  }, []);

  async function handleSubmit(values: {
    modelTier: string;
    providerMode: string;
    selectedProviderId: string;
    promptProfile: string;
    translationStyle: string;
    customPromptInstructions: string;
    ttsProvider: string;
    ttsModel: string;
  }) {
    const nextTtsProvider = values.ttsProvider as TTSProvider;
    const updated: RuntimeSettings = {
      modelTier: values.modelTier as ModelTier,
      providerMode: values.providerMode as ProviderSelectionMode,
      selectedProviderId: values.selectedProviderId as ProviderId,
      modelOverrides: settings?.modelOverrides ?? {},
      promptProfile: values.promptProfile as PromptProfile,
      translationStyle: values.translationStyle as TranslationStyle,
      customPromptInstructions: values.customPromptInstructions.trim().slice(0, 4000),
      ttsProvider: nextTtsProvider,
      ttsModel: values.ttsModel || getDefaultTTSModel(nextTtsProvider, preferences),
    };

    await saveRuntimeSettings(updated);
    await showToast({ style: Toast.Style.Success, title: "Settings saved" });
    await popToRoot();
  }

  async function handleReset() {
    const defaults = getDefaultRuntimeSettings();
    await saveRuntimeSettings(defaults);
    setSettings(defaults);
    setTtsProvider(defaults.ttsProvider);
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
        title="Default Model Tier"
        defaultValue={settings.modelTier}
        info="Fast/Pro use built-in model catalogs. Provider-specific model picks in the action panel override this tier."
      >
        <Form.Dropdown.Item value="fast" title="Fast — Flash / Mini models, speed priority" icon={Icon.Bolt} />
        <Form.Dropdown.Item value="pro" title="Pro — Best models, quality priority" icon={Icon.Star} />
        <Form.Dropdown.Item value="custom" title="Custom — Use models set in Preferences" icon={Icon.Gear} />
      </Form.Dropdown>

      <Form.Dropdown id="providerMode" title="Translation Providers" defaultValue={settings.providerMode}>
        <Form.Dropdown.Item value="enabled" title="All Enabled Providers" icon={Icon.List} />
        <Form.Dropdown.Item value="single" title="Single Provider" icon={Icon.Dot} />
      </Form.Dropdown>

      <Form.Dropdown
        id="selectedProviderId"
        title="Single Provider"
        defaultValue={settings.selectedProviderId ?? providerIds[0]}
        info="Used by no-window commands and by Translate/Screenshot Translate when Translation Providers is Single Provider."
      >
        {providerIds.map((id) => (
          <Form.Dropdown.Item key={id} value={id} title={PROVIDER_TITLES[id]} />
        ))}
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

      <Form.Separator />

      <Form.Dropdown
        id="ttsProvider"
        title="Voice Provider"
        defaultValue={settings.ttsProvider}
        onChange={(value) => setTtsProvider(value as TTSProvider)}
      >
        {(["qwen", "gemini"] as TTSProvider[]).map((provider) => (
          <Form.Dropdown.Item key={provider} value={provider} title={TTS_PROVIDER_LABELS[provider]} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        key={`tts-model-${ttsProvider}-${formKey}`}
        id="ttsModel"
        title="Voice Model"
        defaultValue={
          settings.ttsProvider === ttsProvider ? settings.ttsModel : getDefaultTTSModel(ttsProvider, preferences)
        }
        info="Qwen's Instruct model is required for custom speaking instructions and slow teacher-like reading."
      >
        {getTTSModelOptions(ttsProvider).map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
