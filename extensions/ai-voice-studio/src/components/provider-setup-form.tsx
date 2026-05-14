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
import type { OpenAITTSModel, OpenAIResponseFormat } from "../api/openai-types";
import { FALLBACK_VOICES, groupVoicesByCategory } from "../constants/voices";
import {
  MODEL_LABELS as MIMO_MODEL_LABELS,
  VOICE_CATEGORIES as MIMO_VOICE_CATEGORIES,
  getVoicesByCategory as getMimoVoicesByCategory,
  getVoicesForModel as getMimoVoicesForModel,
} from "../constants/mimo-voices";
import {
  MODEL_LABELS as OPENAI_MODEL_LABELS,
  VOICE_CATEGORIES as OPENAI_VOICE_CATEGORIES,
  getVoicesByCategory as getOpenAIVoicesByCategory,
  getVoicesForModel as getOpenAIVoicesForModel,
} from "../constants/openai-voices";
import { SPEECH_RATE_OPTIONS } from "../constants/mimo-controls";
import { clearQuickReadVoiceOverride as clearMiniMaxQuickReadVoiceOverride } from "../utils/voice-preferences";
import { clearPlaybackSpeed } from "../utils/playback-speed";
import {
  clearProviderSettingsOverrides,
  getProviderSettings,
  getProviderSettingsOverrides,
  saveProviderSettingsOverrides,
  type ProviderSettings,
} from "../utils/provider-settings";
import type { TTSProvider } from "../utils/provider";
import { setQuickReadVoiceOverride as setMiniMaxQuickReadVoiceOverride } from "../utils/voice-preferences";
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

const MINIMAX_MODEL_OPTIONS = [
  { value: "speech-2.8-hd", title: "Speech 2.8 HD" },
  { value: "speech-2.8-turbo", title: "Speech 2.8 Turbo" },
  { value: "speech-2.6-hd", title: "Speech 2.6 HD" },
  { value: "speech-2.6-turbo", title: "Speech 2.6 Turbo" },
  { value: "speech-02-hd", title: "Speech 02 HD" },
  { value: "speech-02-turbo", title: "Speech 02 Turbo" },
];

const MINIMAX_AUTH_MODE_OPTIONS = [
  { value: "auto", title: "Auto Detect" },
  { value: "token-plan", title: "Token Plan Key" },
  { value: "payg", title: "Open Platform API Key" },
];

const PLAYBACK_RATE_OPTIONS = [
  { value: "0.5", title: "0.5x" },
  { value: "0.75", title: "0.75x" },
  { value: "1", title: "1.0x" },
  { value: "1.25", title: "1.25x" },
  { value: "1.5", title: "1.5x" },
  { value: "1.75", title: "1.75x" },
  { value: "2", title: "2.0x" },
];

const LANGUAGE_BOOST_OPTIONS = [
  { value: "auto", title: "Auto" },
  { value: "Chinese", title: "Chinese" },
  { value: "Chinese,Yue", title: "Cantonese" },
  { value: "English", title: "English" },
  { value: "Japanese", title: "Japanese" },
  { value: "Korean", title: "Korean" },
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

  const updateMiniMax = useCallback(
    (patch: Partial<ProviderSettings["minimax"]>) => {
      updateSettings((current) => ({ ...current, minimax: { ...current.minimax, ...patch } }));
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
          : (nextVoices[0]?.id ?? "mimo_default");
        return { ...current, mimo: { ...current.mimo, model: nextModel, defaultVoice: nextVoice } };
      });
    },
    [updateSettings],
  );

  const handleOpenAIModelChange = useCallback(
    (value: string) => {
      const nextModel = value as OpenAITTSModel;
      updateSettings((current) => {
        const nextVoices = getOpenAIVoicesForModel(nextModel);
        const nextVoice = nextVoices.some((voice) => voice.id === current.openai.voice)
          ? current.openai.voice
          : (nextVoices[0]?.id ?? "cedar");
        return { ...current, openai: { ...current.openai, model: nextModel, voice: nextVoice } };
      });
    },
    [updateSettings],
  );

  const handleSubmit = useCallback(async () => {
    if (!settings) return;
    setIsSaving(true);

    try {
      const saved = await saveProviderSettingsOverrides(settings);
      await Promise.all([
        setMiniMaxQuickReadVoiceOverride(saved.minimax.customDefaultVoice || saved.minimax.defaultVoice),
        setMimoQuickReadVoiceOverride(saved.mimo.defaultVoice),
        setOpenAIQuickReadVoiceOverride(saved.openai.voice),
        clearPlaybackSpeed(),
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
        clearMiniMaxQuickReadVoiceOverride(),
        clearMimoQuickReadVoiceOverride(),
        clearOpenAIQuickReadVoiceOverride(),
        clearPlaybackSpeed(),
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
        <Form.Dropdown.Item value="minimax" title="MiniMax" />
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
        <Form.Dropdown.Item value="minimax" title="MiniMax Defaults" />
        <Form.Dropdown.Item value="mimo" title="MiMo Defaults" />
        <Form.Dropdown.Item value="openai" title="OpenAI Defaults" />
      </Form.Dropdown>

      <Form.Separator />
      {activeProvider === "minimax" ? (
        <>
          <Form.Description title="MiniMax" text="Long reading, voice clone, and MiniMax voices." />
          <Form.Dropdown
            id="minimaxAuthMode"
            title="Authentication"
            value={settings.minimax.authMode}
            onChange={(authMode) =>
              updateMiniMax({ authMode: authMode === "token-plan" || authMode === "payg" ? authMode : "auto" })
            }
          >
            {MINIMAX_AUTH_MODE_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="minimaxModel"
            title="Model"
            value={settings.minimax.model}
            onChange={(model) => updateMiniMax({ model })}
          >
            {MINIMAX_MODEL_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="minimaxDefaultVoice"
            title="Voice"
            value={settings.minimax.defaultVoice}
            onChange={(defaultVoice) => updateMiniMax({ defaultVoice })}
          >
            {groupVoicesByCategory(FALLBACK_VOICES).map(([category, voices]) => (
              <Form.Dropdown.Section key={category} title={category}>
                {voices.map((voice) => (
                  <Form.Dropdown.Item key={voice.id} value={voice.id} title={voice.name} />
                ))}
              </Form.Dropdown.Section>
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="minimaxSpeechRate"
            title="Speed"
            value={settings.minimax.speechRate}
            onChange={(speechRate) => updateMiniMax({ speechRate })}
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
            {mimoVoices.length === 0 ? <Form.Dropdown.Item value="mimo_default" title="MiMo Default" /> : null}
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
          <Form.Description title="OpenAI" text="OpenAI Speech API voices." />
          <Form.Dropdown
            id="openaiModel"
            title="Model"
            value={settings.openai.model}
            onChange={handleOpenAIModelChange}
          >
            {(Object.keys(OPENAI_MODEL_LABELS) as OpenAITTSModel[]).map((model) => (
              <Form.Dropdown.Item key={model} value={model} title={OPENAI_MODEL_LABELS[model]} />
            ))}
          </Form.Dropdown>
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
          {activeProvider === "minimax" ? (
            <>
              <Form.Separator />
              <Form.Description title="MiniMax Advanced" text="Custom voices, language, and endpoint region." />
              <Form.TextField
                id="minimaxCustomDefaultVoice"
                title="Custom Voice ID"
                value={settings.minimax.customDefaultVoice}
                placeholder="voice_id"
                onChange={(customDefaultVoice) => updateMiniMax({ customDefaultVoice })}
              />
              <Form.TextField
                id="minimaxCustomVoiceIds"
                title="Extra Voice IDs"
                value={settings.minimax.customVoiceIds}
                placeholder="voice_id_1, voice_id_2"
                onChange={(customVoiceIds) => updateMiniMax({ customVoiceIds })}
              />
              <Form.Dropdown
                id="minimaxLanguageBoost"
                title="Language"
                value={settings.minimax.languageBoost}
                onChange={(languageBoost) => updateMiniMax({ languageBoost })}
              >
                {LANGUAGE_BOOST_OPTIONS.map((option) => (
                  <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
                ))}
              </Form.Dropdown>
              <Form.Dropdown
                id="minimaxRegion"
                title="Region"
                value={settings.minimax.region}
                onChange={(region) => updateMiniMax({ region: region === "global" ? "global" : "cn" })}
              >
                <Form.Dropdown.Item value="cn" title="China" />
                <Form.Dropdown.Item value="global" title="Global" />
              </Form.Dropdown>
            </>
          ) : null}

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

          {activeProvider === "openai" ? (
            <>
              <Form.Separator />
              <Form.Description title="OpenAI Advanced" text="Audio format and speaking instructions." />
              <Form.Dropdown
                id="openaiResponseFormat"
                title="Format"
                value={settings.openai.responseFormat}
                onChange={(responseFormat) => updateOpenAI({ responseFormat: responseFormat as OpenAIResponseFormat })}
              >
                <Form.Dropdown.Item value="mp3" title="MP3" />
                <Form.Dropdown.Item value="wav" title="WAV" />
              </Form.Dropdown>
              <Form.TextArea
                id="openaiInstructions"
                title="Instructions"
                value={settings.openai.instructions}
                placeholder="Optional speaking direction"
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
  if (value === "mimo" || value === "openai") return value;
  return "minimax";
}

function labelProvider(provider: TTSProvider): string {
  if (provider === "mimo") return "MiMo";
  if (provider === "openai") return "OpenAI";
  return "MiniMax";
}

function openVoiceSetupTest(): Promise<void> {
  return launchCommand({ name: "test-voice-setup", type: LaunchType.UserInitiated });
}
