import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MimoTTSModel } from "../api/mimo-types";
import {
  MODEL_LABELS,
  VOICE_CATEGORIES,
  getDefaultVoiceForModel,
  getVoicesByCategory,
  getVoicesForModel,
} from "../constants/mimo-voices";
import { SPEECH_RATE_OPTIONS } from "../constants/mimo-controls";
import {
  DEFAULT_MIMO_SETTINGS,
  clearMimoSettingsOverrides,
  getMimoSettings,
  getMimoSettingsOverrides,
  saveMimoSettingsOverrides,
  type MimoProviderSettings,
} from "../utils/provider-settings";
import { clearQuickReadVoiceOverride, setQuickReadVoiceOverride } from "../utils/mimo-voice-preferences";
import { clearSpeedOverride } from "../utils/mimo-playback-state";

interface SetupFormValues extends Form.Values {
  model: MimoTTSModel;
  defaultVoice: string;
  speechRate: string;
  stylePrompt: string;
  tokenPlanBaseUrl: string;
}

const MODELS: MimoTTSModel[] = ["mimo-v2.5-tts", "mimo-v2-tts"];

export default function SetupVoiceDefaults() {
  const [settings, setSettings] = useState<MimoProviderSettings>(DEFAULT_MIMO_SETTINGS);
  const [hasOverrides, setHasOverrides] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // The model Form.Dropdown is uncontrolled (defaultValue only), so settings.model
  // would never reflect an in-form change. Track the in-progress selection here
  // so the voice list filters by the model the user just picked, not the model
  // that was loaded from storage.
  const [selectedModel, setSelectedModel] = useState<MimoTTSModel>(DEFAULT_MIMO_SETTINGS.model);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [resolved, overrides] = await Promise.all([getMimoSettings(), getMimoSettingsOverrides()]);
        if (!mounted) return;
        setSettings(resolved);
        setSelectedModel(resolved.model);
        setHasOverrides(overrides !== null);
      } finally {
        // Without try/finally, a transient LocalStorage rejection from either
        // promise leaves isLoading=true forever, the spinner never clears,
        // and the form is unusable until the command is relaunched.
        if (mounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const voicesForModel = useMemo(() => getVoicesForModel(selectedModel), [selectedModel]);

  const handleSubmit = useCallback(async (values: SetupFormValues) => {
    const saved = await saveMimoSettingsOverrides({
      model: values.model,
      defaultVoice: values.defaultVoice,
      speechRate: values.speechRate,
      stylePrompt: values.stylePrompt,
      tokenPlanBaseUrl: values.tokenPlanBaseUrl,
    });
    setSettings(saved);
    setHasOverrides(true);

    await setQuickReadVoiceOverride(saved.defaultVoice);

    await showToast({
      style: Toast.Style.Success,
      title: "Voice defaults saved",
      message: `${MODEL_LABELS[saved.model]} · ${saved.defaultVoice}`,
    });
  }, []);

  const handleReset = useCallback(async () => {
    await Promise.all([clearMimoSettingsOverrides(), clearQuickReadVoiceOverride(), clearSpeedOverride()]);
    const fresh = await getMimoSettings();
    setSettings(fresh);
    setHasOverrides(false);
    await showToast({ style: Toast.Style.Success, title: "Voice defaults reset" });
  }, []);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Setup MiMo Voice Defaults"
      actions={
        <ActionPanel>
          <Action.SubmitForm<SetupFormValues>
            title="Save Voice Defaults"
            icon={Icon.SaveDocument}
            onSubmit={handleSubmit}
          />
          {hasOverrides ? (
            <Action title="Reset to Preferences" icon={Icon.RotateClockwise} onAction={handleReset} />
          ) : null}
          {}
          <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="MiMo Voice Defaults"
        text="These defaults drive Quick Read, Read with Voice, and TTS Studio when no override is set. Reset clears the saved override and falls back to Raycast Preferences."
      />
      <Form.Dropdown
        id="model"
        title="Model"
        defaultValue={settings.model}
        onChange={(value) => setSelectedModel(value as MimoTTSModel)}
      >
        {MODELS.map((model) => (
          <Form.Dropdown.Item key={model} value={model} title={MODEL_LABELS[model]} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="defaultVoice" title="Default Voice" defaultValue={settings.defaultVoice}>
        {VOICE_CATEGORIES.map((category) => {
          const voices = getVoicesByCategory(category, selectedModel);
          if (voices.length === 0) return null;
          return (
            <Form.Dropdown.Section key={category} title={category}>
              {voices.map((voice) => (
                <Form.Dropdown.Item key={voice.id} value={voice.id} title={voice.name} />
              ))}
            </Form.Dropdown.Section>
          );
        })}
        {/* Ensure currently selected voice always renders as an option even if filtered out by model. */}
        {voicesForModel.some((voice) => voice.id === settings.defaultVoice) ||
        voicesForModel.some((voice) => voice.id === getDefaultVoiceForModel(selectedModel)) ? null : (
          <Form.Dropdown.Item
            key={getDefaultVoiceForModel(selectedModel)}
            value={getDefaultVoiceForModel(selectedModel)}
            title="Default English Voice"
          />
        )}
      </Form.Dropdown>
      <Form.Dropdown id="speechRate" title="Default Speech Rate" defaultValue={settings.speechRate}>
        {SPEECH_RATE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="stylePrompt"
        title="Default Style Prompt"
        defaultValue={settings.stylePrompt ?? ""}
        placeholder="Optional natural-language direction sent to MiMo for every reading."
      />
      <Form.TextField
        id="tokenPlanBaseUrl"
        title="Token Plan Base URL"
        defaultValue={settings.tokenPlanBaseUrl}
        placeholder="https://token-plan-cn.xiaomimimo.com/v1"
      />
    </Form>
  );
}

export function OpenProviderSetupAction({ provider }: { provider?: "mimo" } = {}) {
  // The `provider` prop is preserved for source-compatibility with the original
  // multi-provider AI Voice Studio; this standalone extension only has MiMo.
  void provider;
  return (
    <Action
      title="Setup Voice Defaults"
      icon={Icon.Gauge}
      onAction={() =>
        launchCommand({ name: "setup-voice-defaults", type: LaunchType.UserInitiated }).catch(() => undefined)
      }
    />
  );
}
