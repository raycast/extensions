import { Action, ActionPanel, Form, Icon, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { MODEL_LABELS, VOICES, getVoicesForModel } from "./constants/openai-voices";
import {
  DEFAULT_PROVIDER_SETTINGS,
  type ProviderSettings,
  getProviderSettings,
  setProviderSettings,
} from "./utils/provider-settings";
import type { OpenAITTSModel } from "./api/openai-types";
import type { TTSProvider } from "./utils/provider";

interface ProviderSettingsFormValues extends Form.Values {
  defaultProvider: TTSProvider;
  openaiModel: OpenAITTSModel;
  openaiVoice: string;
  openaiResponseFormat: "mp3" | "wav";
  openaiPlaybackRate: string;
  openaiInstructions?: string;
}

export default function ConfigureProviders() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [selectedOpenAIModel, setSelectedOpenAIModel] = useState<OpenAITTSModel>(
    DEFAULT_PROVIDER_SETTINGS.openai.model,
  );

  useEffect(() => {
    let mounted = true;
    getProviderSettings().then((loaded) => {
      if (!mounted) return;
      setSettings(loaded);
      setSelectedOpenAIModel(loaded.openai.model);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = useCallback(async (values: ProviderSettingsFormValues) => {
    const nextSettings: ProviderSettings = {
      defaultProvider: values.defaultProvider,
      openai: {
        model: values.openaiModel,
        voice: values.openaiVoice,
        responseFormat: values.openaiResponseFormat,
        playbackRate: values.openaiPlaybackRate,
        instructions: values.openaiInstructions?.trim() || "",
      },
    };
    await setProviderSettings(nextSettings);
    setSettings(nextSettings);
    await showToast({
      style: Toast.Style.Success,
      title: "Provider settings saved",
      message: "Quick Read and OpenAI commands will use these settings.",
    });
  }, []);

  const loaded = settings ?? DEFAULT_PROVIDER_SETTINGS;
  const openAIVoices = getVoicesForModel(selectedOpenAIModel);
  const selectedVoiceIsAvailable = openAIVoices.some((voice) => voice.id === loaded.openai.voice);
  const defaultVoice = selectedVoiceIsAvailable ? loaded.openai.voice : openAIVoices[0]?.id;

  return (
    <Form
      isLoading={!settings}
      navigationTitle="Configure Voice Providers"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Provider Settings" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
          <Action title="Open Api Key Preferences" icon={Icon.Key} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description text="API keys stay in Raycast Preferences. Model, voice, format, speed, and the default provider live here." />
      <Form.Dropdown id="defaultProvider" title="Default TTS Provider" defaultValue={loaded.defaultProvider}>
        <Form.Dropdown.Item value="minimax" title="MiniMax (Long Reading and Voice Clone)" />
        <Form.Dropdown.Item value="mimo" title="MiMo (Expressive Studio)" />
        <Form.Dropdown.Item value="openai" title="OpenAI (Speech API)" />
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description title="OpenAI" text="Used by Quick Read when OpenAI is the default provider." />
      <Form.Dropdown
        id="openaiModel"
        title="Model"
        defaultValue={loaded.openai.model}
        onChange={(value) => setSelectedOpenAIModel(value as OpenAITTSModel)}
      >
        {Object.entries(MODEL_LABELS).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown key={selectedOpenAIModel} id="openaiVoice" title="Voice" defaultValue={defaultVoice}>
        {openAIVoices.map((voice) => (
          <Form.Dropdown.Item
            key={voice.id}
            value={voice.id}
            title={`${voice.name}${voice.recommended ? " (Recommended)" : ""}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="openaiResponseFormat" title="Response Format" defaultValue={loaded.openai.responseFormat}>
        <Form.Dropdown.Item value="mp3" title="MP3" />
        <Form.Dropdown.Item value="wav" title="WAV" />
      </Form.Dropdown>
      <Form.Dropdown id="openaiPlaybackRate" title="Playback Rate" defaultValue={loaded.openai.playbackRate}>
        <Form.Dropdown.Item value="0.5" title="0.5x (Slow)" />
        <Form.Dropdown.Item value="0.75" title="0.75x" />
        <Form.Dropdown.Item value="1" title="1.0x (Normal)" />
        <Form.Dropdown.Item value="1.25" title="1.25x" />
        <Form.Dropdown.Item value="1.5" title="1.5x" />
        <Form.Dropdown.Item value="1.75" title="1.75x" />
        <Form.Dropdown.Item value="2" title="2.0x (Fast)" />
      </Form.Dropdown>
      <Form.TextArea
        id="openaiInstructions"
        title="Speaking Instructions"
        defaultValue={loaded.openai.instructions}
        placeholder="Read naturally and clearly; preserve Chinese and English pronunciation."
        info="Sent only with gpt-4o-mini-tts requests."
      />

      <Form.Separator />
      <Form.Description
        text={`${VOICES.length} OpenAI voices are available. MiniMax and MiMo API keys and legacy options remain in Preferences for now.`}
      />
    </Form>
  );
}
