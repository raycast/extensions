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
import type { QwenTTSLanguageType, QwenTTSModel, QwenTTSRegion } from "../api/qwen-tts-types";
import type {
  OpenAIResponseFormat,
  OpenAITone,
  OpenAIExpressiveness,
  OpenAIDelivery,
  OpenAIAccentFocus,
} from "../api/openai-types";
import {
  LANGUAGE_TYPE_LABELS as QWEN_LANGUAGE_TYPE_LABELS,
  MODEL_LABELS as QWEN_MODEL_LABELS,
  QWEN_MODELS,
  QWEN_REGION_BASE_URLS,
  QWEN_REGION_LABELS,
  QWEN_REGIONS,
  VOICE_CATEGORIES as QWEN_VOICE_CATEGORIES,
  getVoicesByCategory as getQwenVoicesByCategory,
  getVoicesForModel as getQwenVoicesForModel,
  supportsInstructions as qwenSupportsInstructions,
} from "../constants/qwen-tts-voices";
import {
  MODEL_LABELS as MIMO_MODEL_LABELS,
  VOICE_CATEGORIES as MIMO_VOICE_CATEGORIES,
  getDefaultVoiceForModel,
  getVoicesByCategory as getMimoVoicesByCategory,
  getVoicesForModel as getMimoVoicesForModel,
} from "../constants/mimo-voices";
import {
  VOICE_CATEGORIES as OPENAI_VOICE_CATEGORIES,
  getVoicesByCategory as getOpenAIVoicesByCategory,
  getVoicesForModel as getOpenAIVoicesForModel,
} from "../constants/openai-voices";
import {
  TONE_OPTIONS,
  EXPRESSIVENESS_OPTIONS,
  DELIVERY_OPTIONS,
  ACCENT_FOCUS_OPTIONS,
} from "../constants/openai-style";
import { SPEECH_RATE_OPTIONS } from "../constants/mimo-controls";
import {
  clearProviderSettingsOverrides,
  getProviderSettings,
  getProviderSettingsOverrides,
  saveProviderSettingsOverrides,
  type ProviderSettings,
} from "../utils/provider-settings";
import type { TTSProvider } from "../utils/provider";
import {
  clearQuickReadVoiceOverride as clearQwenQuickReadVoiceOverride,
  setQuickReadVoiceOverride as setQwenQuickReadVoiceOverride,
} from "../utils/qwen-voice-preferences";
import {
  clearQuickReadVoiceOverride as clearMimoQuickReadVoiceOverride,
  setQuickReadVoiceOverride as setMimoQuickReadVoiceOverride,
} from "../utils/mimo-voice-preferences";
import {
  clearQuickReadVoiceOverride as clearOpenAIQuickReadVoiceOverride,
  setQuickReadVoiceOverride as setOpenAIQuickReadVoiceOverride,
} from "../utils/openai-voice-preferences";
import { clearSpeedOverride as clearMimoSpeedOverride } from "../utils/mimo-playback-state";
import { clearSpeedOverride as clearOpenAISpeedOverride } from "../utils/openai-playback-state";
import { clearSpeedOverride as clearQwenSpeedOverride } from "../utils/qwen-playback-state";

const PLAYBACK_RATE_OPTIONS = [
  { value: "0.5", title: "0.5x" },
  { value: "0.75", title: "0.75x" },
  { value: "1", title: "1.0x" },
  { value: "1.25", title: "1.25x" },
  { value: "1.5", title: "1.5x" },
  { value: "1.75", title: "1.75x" },
  { value: "2", title: "2.0x" },
];

interface OpenProviderSetupActionProps {
  title?: string;
  provider?: TTSProvider;
}

export function OpenProviderSetupAction({ title = "Setup Voice Defaults", provider }: OpenProviderSetupActionProps) {
  return <Action.Push title={title} icon={Icon.Gauge} target={<ProviderSetupForm initialProvider={provider} />} />;
}

interface ProviderSetupFormProps {
  initialProvider?: TTSProvider;
}

export function ProviderSetupForm({ initialProvider }: ProviderSetupFormProps = {}) {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [hasOverrides, setHasOverrides] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [setupProvider, setSetupProvider] = useState<TTSProvider | null>(initialProvider ?? null);
  const [formVersion, setFormVersion] = useState(0);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const [nextSettings, overrides] = await Promise.all([getProviderSettings(), getProviderSettingsOverrides()]);
    setSettings(nextSettings);
    setSetupProvider((current) => current ?? initialProvider ?? nextSettings.defaultProvider);
    setHasOverrides(Boolean(overrides));
    setFormVersion((current) => current + 1);
    setIsLoading(false);
  }, [initialProvider]);

  useEffect(() => {
    reload().catch(async (error) => {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load settings",
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, [reload]);

  const mimoVoices = useMemo(() => getMimoVoicesForModel(settings?.mimo.model ?? "mimo-v2.5-tts"), [settings]);
  const qwenVoices = useMemo(() => getQwenVoicesForModel(settings?.qwen.model ?? "qwen3-tts-flash"), [settings]);
  const openaiVoices = useMemo(() => getOpenAIVoicesForModel(settings?.openai.model ?? "gpt-4o-mini-tts"), [settings]);

  const updateSettings = useCallback((updater: (current: ProviderSettings) => ProviderSettings) => {
    setSettings((current) => (current ? updater(current) : current));
  }, []);

  const handleDefaultProviderChange = useCallback(
    (value: string) => {
      const provider = toProvider(value);
      updateSettings((current) => ({ ...current, defaultProvider: provider }));
      setSetupProvider(provider);
    },
    [updateSettings],
  );

  const handleSetupProviderChange = useCallback((value: string) => {
    setSetupProvider(toProvider(value));
  }, []);

  const updateQwen = useCallback(
    (patch: Partial<ProviderSettings["qwen"]>) => {
      updateSettings((current) => ({ ...current, qwen: { ...current.qwen, ...patch } }));
    },
    [updateSettings],
  );

  const updateMimo = useCallback(
    (patch: Partial<ProviderSettings["mimo"]>) => {
      updateSettings((current) => ({ ...current, mimo: { ...current.mimo, ...patch } }));
    },
    [updateSettings],
  );

  const updateOpenAI = useCallback(
    (patch: Partial<ProviderSettings["openai"]>) => {
      updateSettings((current) => ({ ...current, openai: { ...current.openai, ...patch } }));
    },
    [updateSettings],
  );

  const handleMimoModelChange = useCallback(
    (value: string) => {
      const nextModel = value as MimoTTSModel;
      updateSettings((current) => {
        const nextVoices = getMimoVoicesForModel(nextModel);
        const nextVoice = nextVoices.some((voice) => voice.id === current.mimo.defaultVoice)
          ? current.mimo.defaultVoice
          : getDefaultVoiceForModel(nextModel);
        return { ...current, mimo: { ...current.mimo, model: nextModel, defaultVoice: nextVoice } };
      });
    },
    [updateSettings],
  );

  const handleQwenModelChange = useCallback(
    (value: string) => {
      const nextModel = value as QwenTTSModel;
      updateSettings((current) => {
        const nextVoices = getQwenVoicesForModel(nextModel);
        const nextVoice = nextVoices.some((voice) => voice.id === current.qwen.voice)
          ? current.qwen.voice
          : (nextVoices[0]?.id ?? "Cherry");
        return { ...current, qwen: { ...current.qwen, model: nextModel, voice: nextVoice } };
      });
    },
    [updateSettings],
  );

  const handleQwenRegionChange = useCallback(
    (value: string) => {
      const region = value as QwenTTSRegion;
      updateSettings((current) => ({
        ...current,
        qwen: {
          ...current.qwen,
          region,
          baseUrl: region === "custom" ? current.qwen.baseUrl : QWEN_REGION_BASE_URLS[region],
        },
      }));
    },
    [updateSettings],
  );

  const handleSubmit = useCallback(async () => {
    if (!settings) return;
    setIsSaving(true);

    try {
      const saved = await saveProviderSettingsOverrides(settings);
      await Promise.all([
        setQwenQuickReadVoiceOverride(saved.qwen.voice),
        setMimoQuickReadVoiceOverride(saved.mimo.defaultVoice),
        setOpenAIQuickReadVoiceOverride(saved.openai.voice),
        clearQwenSpeedOverride(),
        clearMimoSpeedOverride(),
        clearOpenAISpeedOverride(),
      ]);
      setSettings(saved);
      setHasOverrides(true);
      setFormVersion((current) => current + 1);
      await showToast({
        style: Toast.Style.Success,
        title: "Voice defaults saved",
        primaryAction: { title: "Test Voice Setup", onAction: openVoiceSetupTest },
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save defaults",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const handleReset = useCallback(async () => {
    setIsSaving(true);

    try {
      await Promise.all([
        clearProviderSettingsOverrides(),
        clearQwenQuickReadVoiceOverride(),
        clearMimoQuickReadVoiceOverride(),
        clearOpenAIQuickReadVoiceOverride(),
        clearQwenSpeedOverride(),
        clearMimoSpeedOverride(),
        clearOpenAISpeedOverride(),
      ]);
      await reload();
      await showToast({ style: Toast.Style.Success, title: "Setup overrides reset" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not reset defaults",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [reload]);

  if (!settings) {
    return <Form isLoading={isLoading} navigationTitle="Setup Voice Defaults" />;
  }

  const activeProvider = setupProvider ?? settings.defaultProvider;

  return (
    <Form
      key={`provider-setup-${formVersion}`}
      isLoading={isLoading || isSaving}
      navigationTitle="Setup Voice Defaults"
      actions={
        <ActionPanel>
          <Action.SubmitForm<Form.Values> title="Save Voice Defaults" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
          <Action
            title={showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}
            icon={Icon.Gear}
            onAction={() => setShowAdvanced((current) => !current)}
          />
          <Action title="Test Saved Setup" icon={Icon.Waveform} onAction={openVoiceSetupTest} />
          <Action title="Reset Overrides" icon={Icon.ArrowCounterClockwise} onAction={handleReset} />
          <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="defaultProvider"
        title="Default Provider"
        value={settings.defaultProvider}
        onChange={handleDefaultProviderChange}
        info={hasOverrides ? "Quick Setup overrides are active." : "This is saved as a Quick Setup override."}
      >
        <Form.Dropdown.Item value="qwen" title="Qwen-TTS" />
        <Form.Dropdown.Item value="mimo" title="MiMo" />
        <Form.Dropdown.Item value="openai" title="OpenAI" />
      </Form.Dropdown>
      <Form.Dropdown
        id="setupProvider"
        title="Configure"
        value={activeProvider}
        onChange={handleSetupProviderChange}
        info={`Only ${labelProvider(activeProvider)} settings are shown below, so the form stays short in the Raycast sidebar.`}
      >
        <Form.Dropdown.Item value="qwen" title="Qwen-TTS Defaults" />
        <Form.Dropdown.Item value="mimo" title="MiMo Defaults" />
        <Form.Dropdown.Item value="openai" title="OpenAI Defaults" />
      </Form.Dropdown>

      <Form.Separator />
      {activeProvider === "qwen" ? (
        <>
          <Form.Description title="Qwen-TTS" text="Qwen DashScope (Alibaba Cloud Model Studio) Qwen-TTS synthesis." />
          <Form.Dropdown id="qwenModel" title="Model" value={settings.qwen.model} onChange={handleQwenModelChange}>
            {QWEN_MODELS.map((model) => (
              <Form.Dropdown.Item key={model} value={model} title={QWEN_MODEL_LABELS[model]} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="qwenVoice"
            title="Voice"
            value={settings.qwen.voice}
            onChange={(voice) => updateQwen({ voice })}
          >
            {QWEN_VOICE_CATEGORIES.map((category) => {
              const voices = getQwenVoicesByCategory(category, settings.qwen.model);
              if (voices.length === 0) return null;
              return (
                <Form.Dropdown.Section key={category} title={category}>
                  {voices.map((voice) => (
                    <Form.Dropdown.Item key={voice.id} value={voice.id} title={voice.name} />
                  ))}
                </Form.Dropdown.Section>
              );
            })}
            {qwenVoices.length === 0 ? <Form.Dropdown.Item value="Cherry" title="Cherry" /> : null}
          </Form.Dropdown>
          <Form.Dropdown
            id="qwenLanguageType"
            title="Language"
            value={settings.qwen.languageType}
            onChange={(languageType) => updateQwen({ languageType: languageType as QwenTTSLanguageType })}
          >
            {(Object.keys(QWEN_LANGUAGE_TYPE_LABELS) as QwenTTSLanguageType[]).map((languageType) => (
              <Form.Dropdown.Item
                key={languageType}
                value={languageType}
                title={QWEN_LANGUAGE_TYPE_LABELS[languageType]}
              />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="qwenPlaybackRate"
            title="Speed"
            value={settings.qwen.playbackRate}
            onChange={(playbackRate) => updateQwen({ playbackRate })}
          >
            {PLAYBACK_RATE_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
        </>
      ) : null}

      {activeProvider === "mimo" ? (
        <>
          <Form.Description title="MiMo" text="Expressive Xiaomi MiMo voices." />
          <Form.Dropdown id="mimoModel" title="Model" value={settings.mimo.model} onChange={handleMimoModelChange}>
            {(Object.keys(MIMO_MODEL_LABELS) as MimoTTSModel[]).map((model) => (
              <Form.Dropdown.Item key={model} value={model} title={MIMO_MODEL_LABELS[model]} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="mimoDefaultVoice"
            title="Voice"
            value={settings.mimo.defaultVoice}
            onChange={(defaultVoice) => updateMimo({ defaultVoice })}
          >
            {MIMO_VOICE_CATEGORIES.map((category) => {
              const voices = getMimoVoicesByCategory(category, settings.mimo.model);
              if (voices.length === 0) return null;
              return (
                <Form.Dropdown.Section key={category} title={category}>
                  {voices.map((voice) => (
                    <Form.Dropdown.Item key={voice.id} value={voice.id} title={voice.name} />
                  ))}
                </Form.Dropdown.Section>
              );
            })}
            {mimoVoices.length === 0 ? (
              <Form.Dropdown.Item value={getDefaultVoiceForModel(settings.mimo.model)} title="Default English Voice" />
            ) : null}
          </Form.Dropdown>
          <Form.Dropdown
            id="mimoSpeechRate"
            title="Speed"
            value={settings.mimo.speechRate}
            onChange={(speechRate) => updateMimo({ speechRate })}
          >
            {SPEECH_RATE_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
        </>
      ) : null}

      {activeProvider === "openai" ? (
        <>
          <Form.Description title="OpenAI" text="GPT-4o Mini TTS with steerable narration." />
          <Form.Dropdown
            id="openaiVoice"
            title="Voice"
            value={settings.openai.voice}
            onChange={(voice) => updateOpenAI({ voice })}
          >
            {OPENAI_VOICE_CATEGORIES.map((category) => {
              const voices = getOpenAIVoicesByCategory(category, settings.openai.model);
              if (voices.length === 0) return null;
              return (
                <Form.Dropdown.Section key={category} title={category}>
                  {voices.map((voice) => (
                    <Form.Dropdown.Item key={voice.id} value={voice.id} title={voice.name} />
                  ))}
                </Form.Dropdown.Section>
              );
            })}
            {openaiVoices.length === 0 ? <Form.Dropdown.Item value="cedar" title="Cedar" /> : null}
          </Form.Dropdown>
          <Form.Dropdown
            id="openaiTone"
            title="Tone"
            value={settings.openai.tone}
            onChange={(tone) => updateOpenAI({ tone: tone as OpenAITone })}
          >
            {TONE_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="openaiDelivery"
            title="Delivery"
            value={settings.openai.delivery}
            onChange={(delivery) => updateOpenAI({ delivery: delivery as OpenAIDelivery })}
          >
            {DELIVERY_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="openaiExpressiveness"
            title="Expressiveness"
            value={settings.openai.expressiveness}
            onChange={(expressiveness) => updateOpenAI({ expressiveness: expressiveness as OpenAIExpressiveness })}
          >
            {EXPRESSIVENESS_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="openaiAccentFocus"
            title="Accent"
            value={settings.openai.accentFocus}
            onChange={(accentFocus) => updateOpenAI({ accentFocus: accentFocus as OpenAIAccentFocus })}
          >
            {ACCENT_FOCUS_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="openaiPlaybackRate"
            title="Speed"
            value={settings.openai.playbackRate}
            onChange={(playbackRate) => updateOpenAI({ playbackRate })}
          >
            {PLAYBACK_RATE_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
        </>
      ) : null}

      {showAdvanced ? (
        <>
          {activeProvider === "mimo" ? (
            <>
              <Form.Separator />
              <Form.Description title="MiMo Advanced" text="Speaking style and Token Plan endpoint." />
              <Form.TextArea
                id="mimoStylePrompt"
                title="Style Prompt"
                value={settings.mimo.stylePrompt}
                placeholder="Optional speaking direction"
                onChange={(stylePrompt) => updateMimo({ stylePrompt })}
              />
              <Form.TextField
                id="mimoTokenPlanBaseUrl"
                title="Base URL"
                value={settings.mimo.tokenPlanBaseUrl}
                placeholder="https://token-plan-cn.xiaomimimo.com/v1"
                onChange={(tokenPlanBaseUrl) => updateMimo({ tokenPlanBaseUrl })}
              />
            </>
          ) : null}

          {activeProvider === "qwen" ? (
            <>
              <Form.Separator />
              <Form.Description
                title="Qwen-TTS Advanced"
                text="DashScope region, optional instruct-model guidance, and custom endpoint settings."
              />
              <Form.Dropdown
                id="qwenRegion"
                title="Region"
                value={settings.qwen.region}
                onChange={handleQwenRegionChange}
              >
                {QWEN_REGIONS.map((region) => (
                  <Form.Dropdown.Item key={region} value={region} title={QWEN_REGION_LABELS[region]} />
                ))}
              </Form.Dropdown>
              <Form.Checkbox
                id="qwenOptimizeInstructions"
                title="Optimize Instructions"
                label="Let Qwen refine instruct-model guidance"
                value={settings.qwen.optimizeInstructions}
                onChange={(optimizeInstructions) => updateQwen({ optimizeInstructions })}
                info={
                  qwenSupportsInstructions(settings.qwen.model)
                    ? "Only applies when instructions are set for Qwen3 TTS Instruct Flash."
                    : "Select Qwen3 TTS Instruct Flash before this setting is sent."
                }
              />
              <Form.TextArea
                id="qwenInstructions"
                title="Instructions"
                value={settings.qwen.instructions}
                placeholder="Optional. Used by Qwen3 TTS Instruct Flash."
                onChange={(instructions) => updateQwen({ instructions })}
              />
              <Form.TextField
                id="qwenBaseUrl"
                title="Base URL"
                value={settings.qwen.baseUrl}
                placeholder={QWEN_REGION_BASE_URLS.beijing}
                onChange={(baseUrl) => updateQwen({ baseUrl })}
                info={
                  settings.qwen.region === "custom"
                    ? "Custom DashScope-compatible HTTP API base URL."
                    : "Managed by the selected region; switch Region to Custom Endpoint before editing."
                }
              />
            </>
          ) : null}

          {activeProvider === "openai" ? (
            <>
              <Form.Separator />
              <Form.Description title="OpenAI Advanced" text="Audio format and free-form narration notes." />
              <Form.Dropdown
                id="openaiResponseFormat"
                title="Format"
                value={settings.openai.responseFormat}
                onChange={(responseFormat) => updateOpenAI({ responseFormat: responseFormat as OpenAIResponseFormat })}
              >
                <Form.Dropdown.Item value="wav" title="WAV · lowest latency" />
                <Form.Dropdown.Item value="mp3" title="MP3 · general use" />
                <Form.Dropdown.Item value="aac" title="AAC · compact" />
                <Form.Dropdown.Item value="flac" title="FLAC · lossless" />
                <Form.Dropdown.Item value="opus" title="Opus · streaming (requires ffmpeg)" />
              </Form.Dropdown>
              <Form.TextArea
                id="openaiInstructions"
                title="Extra notes"
                value={settings.openai.instructions}
                placeholder="Optional extra direction, appended after the style settings above"
                onChange={(instructions) => updateOpenAI({ instructions })}
              />
            </>
          ) : null}
        </>
      ) : null}
    </Form>
  );
}

function toProvider(value: string): TTSProvider {
  if (value === "qwen" || value === "mimo" || value === "openai") return value;
  return "qwen";
}

function labelProvider(provider: TTSProvider): string {
  if (provider === "qwen") return "Qwen-TTS";
  if (provider === "mimo") return "MiMo";
  if (provider === "openai") return "OpenAI";
  return "Qwen-TTS";
}

function openVoiceSetupTest(): Promise<void> {
  return launchCommand({ name: "test-voice-setup", type: LaunchType.UserInitiated });
}
