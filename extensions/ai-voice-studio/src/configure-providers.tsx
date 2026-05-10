import { Action, ActionPanel, Form, Icon, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import type { MimoTTSModel } from "./api/mimo-types";
import type { OpenAITTSModel } from "./api/openai-types";
import { FALLBACK_VOICES } from "./constants/voices";
import { MODEL_LABELS as MIMO_MODEL_LABELS, getVoicesForModel as getMimoVoicesForModel } from "./constants/mimo-voices";
import {
  MODEL_LABELS as OPENAI_MODEL_LABELS,
  VOICES as OPENAI_VOICES,
  getVoicesForModel as getOpenAIVoicesForModel,
} from "./constants/openai-voices";
import { type ProviderSettings, getProviderSettings, setProviderSettings } from "./utils/provider-settings";
import type { TTSProvider } from "./utils/provider";

const MINIMAX_MODEL_OPTIONS = [
  { title: "Speech 2.8 HD (Recommended, Token Plan Compatible)", value: "speech-2.8-hd" },
  { title: "Speech 2.8 Turbo (Open Platform Only)", value: "speech-2.8-turbo" },
  { title: "Speech 2.6 HD (Token Plan Compatible)", value: "speech-2.6-hd" },
  { title: "Speech 2.6 Turbo (Open Platform Only)", value: "speech-2.6-turbo" },
  { title: "Speech 02 HD (Token Plan Compatible)", value: "speech-02-hd" },
  { title: "Speech 02 Turbo (Open Platform Only)", value: "speech-02-turbo" },
];

const LANGUAGE_OPTIONS = [
  { title: "Auto", value: "auto" },
  { title: "Chinese", value: "Chinese" },
  { title: "Cantonese", value: "Chinese,Yue" },
  { title: "English", value: "English" },
  { title: "Japanese", value: "Japanese" },
  { title: "Korean", value: "Korean" },
];

const MINIMAX_RATE_OPTIONS = [
  { title: "0.5x (Slow)", value: "0.5" },
  { title: "0.75x", value: "0.75" },
  { title: "1.0x (Normal)", value: "1" },
  { title: "1.25x", value: "1.25" },
  { title: "1.5x", value: "1.5" },
  { title: "1.75x", value: "1.75" },
  { title: "2.0x (Fast)", value: "2" },
];

const MIMO_RATE_OPTIONS = [
  { title: "0.5x (Slow)", value: "-50" },
  { title: "0.75x", value: "-25" },
  { title: "1.0x (Normal)", value: "0" },
  { title: "1.25x", value: "25" },
  { title: "1.5x", value: "50" },
  { title: "1.75x", value: "75" },
  { title: "2.0x (Fast)", value: "100" },
];

interface ProviderSettingsFormValues extends Form.Values {
  defaultProvider: TTSProvider;
  minimaxModel: string;
  minimaxDefaultVoice: string;
  minimaxCustomDefaultVoice?: string;
  minimaxCustomVoiceIds?: string;
  minimaxLanguageBoost: string;
  minimaxSpeechRate: string;
  mimoModel: MimoTTSModel;
  mimoDefaultVoice: string;
  mimoSpeechRate: string;
  mimoStylePrompt?: string;
  openaiModel: OpenAITTSModel;
  openaiVoice: string;
  openaiResponseFormat: "mp3" | "wav";
  openaiPlaybackRate: string;
  openaiInstructions?: string;
}

export default function ConfigureProviders() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [selectedMimoModel, setSelectedMimoModel] = useState<MimoTTSModel>("mimo-v2.5-tts");
  const [selectedOpenAIModel, setSelectedOpenAIModel] = useState<OpenAITTSModel>("gpt-4o-mini-tts");

  useEffect(() => {
    let mounted = true;
    getProviderSettings().then((loaded) => {
      if (!mounted) return;
      setSettings(loaded);
      setSelectedMimoModel(loaded.mimo.model);
      setSelectedOpenAIModel(loaded.openai.model);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = useCallback(async (values: ProviderSettingsFormValues) => {
    const nextSettings: ProviderSettings = {
      defaultProvider: values.defaultProvider,
      minimax: {
        model: values.minimaxModel,
        defaultVoice: values.minimaxDefaultVoice,
        customDefaultVoice: values.minimaxCustomDefaultVoice?.trim() || "",
        customVoiceIds: values.minimaxCustomVoiceIds?.trim() || "",
        languageBoost: values.minimaxLanguageBoost,
        speechRate: values.minimaxSpeechRate,
      },
      mimo: {
        model: values.mimoModel,
        defaultVoice: values.mimoDefaultVoice,
        speechRate: values.mimoSpeechRate,
        stylePrompt: values.mimoStylePrompt?.trim() || "",
      },
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
      title: "Provider Settings Saved",
      message: "Quick Read and provider commands will use these settings.",
    });
  }, []);

  if (!settings) {
    return <Form isLoading navigationTitle="Configure Voice Providers" />;
  }

  const mimoVoices = getMimoVoicesForModel(selectedMimoModel);
  const selectedMimoVoiceIsAvailable = mimoVoices.some((voice) => voice.id === settings.mimo.defaultVoice);
  const mimoDefaultVoice = selectedMimoVoiceIsAvailable ? settings.mimo.defaultVoice : mimoVoices[0]?.id;

  const openAIVoices = getOpenAIVoicesForModel(selectedOpenAIModel);
  const selectedOpenAIVoiceIsAvailable = openAIVoices.some((voice) => voice.id === settings.openai.voice);
  const openAIDefaultVoice = selectedOpenAIVoiceIsAvailable ? settings.openai.voice : openAIVoices[0]?.id;

  return (
    <Form
      navigationTitle="Configure Voice Providers"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Provider Settings" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
          <Action title="Open Preferences" icon={Icon.Key} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description text="API keys and connection details stay in Raycast Preferences. Model, voice, speed, style, and the default provider live here." />
      <Form.Dropdown id="defaultProvider" title="Default TTS Provider" defaultValue={settings.defaultProvider}>
        <Form.Dropdown.Item value="minimax" title="MiniMax (Long Reading and Voice Clone)" />
        <Form.Dropdown.Item value="mimo" title="MiMo (Expressive Studio)" />
        <Form.Dropdown.Item value="openai" title="OpenAI (Speech API)" />
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description
        title="MiniMax"
        text="Used for long-form reading, resume/restart, and voice cloning previews."
      />
      <Form.Dropdown id="minimaxModel" title="Model" defaultValue={settings.minimax.model}>
        {MINIMAX_MODEL_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="minimaxDefaultVoice" title="Default Voice" defaultValue={settings.minimax.defaultVoice}>
        {FALLBACK_VOICES.map((voice) => (
          <Form.Dropdown.Item key={voice.id} value={voice.id} title={`${voice.name} (${voice.category})`} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="minimaxCustomDefaultVoice"
        title="Default Custom Voice ID"
        defaultValue={settings.minimax.customDefaultVoice}
        placeholder="voice_id from MiniMax"
      />
      <Form.TextArea
        id="minimaxCustomVoiceIds"
        title="Extra Custom Voice IDs"
        defaultValue={settings.minimax.customVoiceIds}
        placeholder="voice_id_1, voice_id_2"
      />
      <Form.Dropdown id="minimaxLanguageBoost" title="Language Boost" defaultValue={settings.minimax.languageBoost}>
        {LANGUAGE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="minimaxSpeechRate" title="Speech Rate" defaultValue={settings.minimax.speechRate}>
        {MINIMAX_RATE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description title="MiMo" text="Used by TTS Studio and MiMo quick-read commands." />
      <Form.Dropdown
        id="mimoModel"
        title="Model"
        defaultValue={settings.mimo.model}
        onChange={(value) => setSelectedMimoModel(value as MimoTTSModel)}
      >
        {Object.entries(MIMO_MODEL_LABELS).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        key={selectedMimoModel}
        id="mimoDefaultVoice"
        title="Default Voice"
        defaultValue={mimoDefaultVoice}
      >
        {mimoVoices.map((voice) => (
          <Form.Dropdown.Item
            key={voice.id}
            value={voice.id}
            title={`${voice.name}${voice.recommended ? " (Recommended)" : ""}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="mimoSpeechRate" title="Speech Rate" defaultValue={settings.mimo.speechRate}>
        {MIMO_RATE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="mimoStylePrompt"
        title="Speaking Style"
        defaultValue={settings.mimo.stylePrompt}
        placeholder="Natural, clear, and restrained; suitable for long-form reading."
      />

      <Form.Separator />
      <Form.Description title="OpenAI" text="Used by Quick Read when OpenAI is the default provider." />
      <Form.Dropdown
        id="openaiModel"
        title="Model"
        defaultValue={settings.openai.model}
        onChange={(value) => setSelectedOpenAIModel(value as OpenAITTSModel)}
      >
        {Object.entries(OPENAI_MODEL_LABELS).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown key={selectedOpenAIModel} id="openaiVoice" title="Voice" defaultValue={openAIDefaultVoice}>
        {openAIVoices.map((voice) => (
          <Form.Dropdown.Item
            key={voice.id}
            value={voice.id}
            title={`${voice.name}${voice.recommended ? " (Recommended)" : ""}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="openaiResponseFormat" title="Response Format" defaultValue={settings.openai.responseFormat}>
        <Form.Dropdown.Item value="mp3" title="MP3" />
        <Form.Dropdown.Item value="wav" title="WAV" />
      </Form.Dropdown>
      <Form.Dropdown id="openaiPlaybackRate" title="Playback Rate" defaultValue={settings.openai.playbackRate}>
        {MINIMAX_RATE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="openaiInstructions"
        title="Speaking Instructions"
        defaultValue={settings.openai.instructions}
        placeholder="Read naturally and clearly; preserve Chinese and English pronunciation."
        info="Sent only with gpt-4o-mini-tts requests."
      />

      <Form.Separator />
      <Form.Description
        text={`${FALLBACK_VOICES.length} MiniMax voices, ${mimoVoices.length} MiMo voices, and ${OPENAI_VOICES.length} OpenAI voices are available here.`}
      />
    </Form>
  );
}
