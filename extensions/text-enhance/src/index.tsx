import {
  AI,
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  environment,
  getPreferenceValues,
  getSelectedText,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { CompareDetail } from "./compare";
import {
  askProvider,
  getDefaultProviderModel,
  getProviderSummary,
  loadOpenRouterModels,
  PROVIDER_OPTIONS,
  SUGGESTED_MODELS,
  type GenerationProvider,
  type ProviderModel,
  type ProviderAnswer,
  type ProviderSettings,
} from "./lib/providers";
import { appendHistory } from "./lib/history-storage";
import {
  NO_PRESET,
  clearLastUsedSettings,
  loadLastUsedSettings,
  loadPresets,
  normalizeModelId,
  savePresets,
  saveLastUsedSettings,
  sortPresets,
  type CreativityId,
  type EnhancementId,
  type FormValues,
  type ModelId,
  type PurposeId,
  type RememberedSettings,
  type SavedPreset,
  type ToneId,
} from "./lib/storage";

type GenerationSession = {
  values: FormValues;
  result: string;
  incompleteReason?: string;
};

const PURPOSES = [
  { id: "general", title: "Plain Text", prompt: "plain general-purpose text" },
  { id: "email", title: "Email", prompt: "a polished email" },
  { id: "reply", title: "Reply", prompt: "a concise and useful reply" },
  {
    id: "follow-up",
    title: "Follow-Up",
    prompt: "a polite and clear follow-up message",
  },
  {
    id: "telegram",
    title: "Telegram Message",
    prompt: "a concise Telegram message",
  },
  { id: "slack", title: "Slack Message", prompt: "a clear Slack message" },
  {
    id: "professional-update",
    title: "Professional Update",
    prompt: "a professional status update",
  },
  {
    id: "meeting-summary",
    title: "Meeting Summary",
    prompt: "a clean meeting summary with clear takeaways",
  },
  {
    id: "announcement",
    title: "Announcement",
    prompt: "a clear announcement intended for a group audience",
  },
  {
    id: "customer-support",
    title: "Customer Support",
    prompt: "a helpful and professional customer support message",
  },
  {
    id: "social-post",
    title: "Social Post",
    prompt: "a concise and engaging social post",
  },
  {
    id: "personal-message",
    title: "Personal Message",
    prompt: "a natural and friendly personal message",
  },
  {
    id: "sensitive-message",
    title: "Sensitive Message",
    prompt: "a careful, respectful, and emotionally aware message",
  },
  {
    id: "request",
    title: "Request",
    prompt: "a clear request that is easy to understand and respond to",
  },
  { id: "proposal", title: "Proposal", prompt: "a structured proposal" },
] as const;

const ENHANCEMENTS = [
  {
    id: "clarity",
    title: "Improve Clarity",
    prompt: "Improve clarity and overall flow.",
  },
  {
    id: "grammar",
    title: "Fix Grammar",
    prompt: "Fix grammar, spelling, and punctuation.",
  },
  {
    id: "polish",
    title: "Polish It",
    prompt: "Polish the writing while keeping the meaning intact.",
  },
  {
    id: "shorten",
    title: "Make Shorter",
    prompt: "Shorten the text while preserving the key message.",
  },
  {
    id: "expand",
    title: "Make Fuller",
    prompt: "Expand the text with useful detail without becoming repetitive.",
  },
  {
    id: "funny",
    title: "Make Funny",
    prompt: "Make the text funnier and more witty while keeping it readable.",
  },
  {
    id: "sarcastic",
    title: "Make Sarcastic",
    prompt:
      "Rewrite the text with a sarcastic edge while keeping the meaning recognizable.",
  },
  {
    id: "persuasive",
    title: "Make Persuasive",
    prompt: "Make the text more persuasive and convincing.",
  },
  {
    id: "warmer",
    title: "Make Warmer",
    prompt: "Make the text feel warmer, kinder, and more human.",
  },
  {
    id: "stronger",
    title: "Make Stronger",
    prompt: "Make the text sharper, stronger, and more impactful.",
  },
] as const;

const TONES = [
  { id: "natural", title: "Natural", prompt: "Use a natural, human tone." },
  {
    id: "professional",
    title: "Professional",
    prompt: "Use a professional tone.",
  },
  {
    id: "friendly",
    title: "Friendly",
    prompt: "Use a friendly and approachable tone.",
  },
  { id: "confident", title: "Confident", prompt: "Use a confident tone." },
  { id: "direct", title: "Direct", prompt: "Use a concise and direct tone." },
  { id: "warm", title: "Warm", prompt: "Use a warm and kind tone." },
  { id: "playful", title: "Playful", prompt: "Use a playful and light tone." },
  {
    id: "empathetic",
    title: "Empathetic",
    prompt: "Use an empathetic and considerate tone.",
  },
  { id: "formal", title: "Formal", prompt: "Use a formal tone." },
  {
    id: "persuasive",
    title: "Persuasive",
    prompt: "Use a persuasive and compelling tone.",
  },
  { id: "humble", title: "Humble", prompt: "Use a humble and measured tone." },
  {
    id: "energetic",
    title: "Energetic",
    prompt: "Use an energetic and lively tone.",
  },
] as const;

const MODELS = [
  {
    id: "claude-4-sonnet",
    title: "Claude 4 Sonnet",
    provider: "Anthropic",
    value: AI.Model["Anthropic_Claude_4_Sonnet"],
  },
  {
    id: "claude-4.6-sonnet",
    title: "Claude 4.6 Sonnet",
    provider: "Anthropic",
    value: AI.Model["Anthropic_Claude_4.6_Sonnet"],
  },
  {
    id: "claude-4.5-sonnet",
    title: "Claude 4.5 Sonnet",
    provider: "Anthropic",
    value: AI.Model["Anthropic_Claude_4.5_Sonnet"],
  },
  {
    id: "claude-4.5-haiku",
    title: "Claude 4.5 Haiku",
    provider: "Anthropic",
    value: AI.Model["Anthropic_Claude_4.5_Haiku"],
  },
  {
    id: "claude-4.5-opus",
    title: "Claude 4.5 Opus",
    provider: "Anthropic",
    value: AI.Model["Anthropic_Claude_4.5_Opus"],
  },
  {
    id: "claude-4.6-opus",
    title: "Claude 4.6 Opus",
    provider: "Anthropic",
    value: AI.Model["Anthropic_Claude_4.6_Opus"],
  },
  {
    id: "gpt-5-mini",
    title: "GPT-5 Mini",
    provider: "OpenAI",
    value: AI.Model["OpenAI_GPT-5_mini"],
  },
  {
    id: "gpt-5",
    title: "GPT-5",
    provider: "OpenAI",
    value: AI.Model["OpenAI_GPT-5"],
  },
  {
    id: "gpt-5.1",
    title: "GPT-5.1",
    provider: "OpenAI",
    value: AI.Model["OpenAI_GPT-5.1"],
  },
  {
    id: "gpt-5.2",
    title: "GPT-5.2",
    provider: "OpenAI",
    value: AI.Model["OpenAI_GPT-5.2"],
  },
  {
    id: "gpt-5.3-instant",
    title: "GPT-5.3 Instant",
    provider: "OpenAI",
    value: AI.Model["OpenAI_GPT-5.3_Instant"],
  },
  {
    id: "gpt-5.4",
    title: "GPT-5.4",
    provider: "OpenAI",
    value: AI.Model["OpenAI_GPT-5.4"],
  },
  {
    id: "gpt-4.1",
    title: "GPT-4.1",
    provider: "OpenAI",
    value: AI.Model["OpenAI_GPT-4.1"],
  },
  {
    id: "gpt-4.1-mini",
    title: "GPT-4.1 Mini",
    provider: "OpenAI",
    value: AI.Model["OpenAI_GPT-4.1_mini"],
  },
  {
    id: "gemini-2.5-flash",
    title: "Gemini 2.5 Flash",
    provider: "Google",
    value: AI.Model["Google_Gemini_2.5_Flash"],
  },
  {
    id: "gemini-2.5-pro",
    title: "Gemini 2.5 Pro",
    provider: "Google",
    value: AI.Model["Google_Gemini_2.5_Pro"],
  },
  {
    id: "gemini-3-flash",
    title: "Gemini 3 Flash",
    provider: "Google",
    value: AI.Model["Google_Gemini_3_Flash"],
  },
  {
    id: "gemini-3.1-pro",
    title: "Gemini 3.1 Pro",
    provider: "Google",
    value: AI.Model["Google_Gemini_3.1_Pro"],
  },
  {
    id: "gemini-3.1-flash-lite",
    title: "Gemini 3.1 Flash Lite",
    provider: "Google",
    value: AI.Model["Google_Gemini_3.1_Flash_Lite"],
  },
  {
    id: "gemini-2.5-flash-lite",
    title: "Gemini 2.5 Flash Lite",
    provider: "Google",
    value: AI.Model["Google_Gemini_2.5_Flash_Lite"],
  },
  {
    id: "perplexity-sonar",
    title: "Perplexity Sonar",
    provider: "Perplexity",
    value: AI.Model["Perplexity_Sonar"],
  },
  {
    id: "perplexity-sonar-pro",
    title: "Perplexity Sonar Pro",
    provider: "Perplexity",
    value: AI.Model["Perplexity_Sonar_Pro"],
  },
  {
    id: "grok-4.1-fast",
    title: "Grok 4.1 Fast",
    provider: "xAI",
    value: AI.Model["xAI_Grok-4.1_Fast"],
  },
  {
    id: "grok-4",
    title: "Grok 4",
    provider: "xAI",
    value: AI.Model["xAI_Grok-4"],
  },
  {
    id: "mistral-large",
    title: "Mistral Large",
    provider: "Mistral",
    value: AI.Model["Mistral_Large"],
  },
  {
    id: "mistral-medium",
    title: "Mistral Medium",
    provider: "Mistral",
    value: AI.Model["Mistral_Medium"],
  },
  {
    id: "mistral-small-3",
    title: "Mistral Small 3",
    provider: "Mistral",
    value: AI.Model["Mistral_Small_3"],
  },
  {
    id: "deepseek-v3",
    title: "DeepSeek V3",
    provider: "Together AI",
    value: AI.Model["Together_AI_DeepSeek-V3"],
  },
  {
    id: "deepseek-r1",
    title: "DeepSeek R1",
    provider: "Together AI",
    value: AI.Model["Together_AI_DeepSeek-R1"],
  },
  {
    id: "qwen3-32b",
    title: "Qwen3 32B",
    provider: "Groq",
    value: AI.Model["Groq_Qwen3-32B"],
  },
  {
    id: "kimi-k2-instruct",
    title: "Kimi K2 Instruct",
    provider: "Groq",
    value: AI.Model["Groq_Kimi_K2_Instruct"],
  },
] as const;

const CREATIVITY_LEVELS = [
  { id: "low", title: "Low", value: 0.2 },
  { id: "balanced", title: "Balanced", value: 1 },
  { id: "high", title: "High", value: 1.8 },
] as const;

export default function Command() {
  const preferences = getPreferenceValues<Preferences & ProviderSettings>();
  const defaultValues = getDefaultFormValues(preferences);

  const [values, setValues] = useState<FormValues>(defaultValues);
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(NO_PRESET);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<GenerationSession | null>(null);
  const [correctionPrompt, setCorrectionPrompt] = useState("");
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<ProviderModel[]>([]);
  const [modelListError, setModelListError] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const usesRaycastAI = values.generationProvider === "raycast";
  const providerModels =
    values.generationProvider === "openrouter"
      ? openRouterModels
      : values.generationProvider === "raycast"
        ? []
        : SUGGESTED_MODELS[values.generationProvider];

  const selectedPreset =
    selectedPresetId === NO_PRESET
      ? undefined
      : presets.find((preset) => preset.id === selectedPresetId);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const storedPresets = await loadPresets(defaultValues);
        const rememberedSettings = await loadLastUsedSettings(defaultValues);
        const startupValues = rememberedSettings
          ? { ...defaultValues, ...rememberedSettings }
          : defaultValues;

        let initialText = "";

        try {
          initialText = (await getSelectedText()).trim();
        } catch {
          initialText = "";
        }

        if (!initialText) {
          initialText = (await Clipboard.readText())?.trim() ?? "";
        }

        if (!cancelled) {
          setPresets(storedPresets);
          setValues({ ...startupValues, draft: initialText || "" });
          setSelectedPresetId(NO_PRESET);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (values.generationProvider !== "openrouter") return;
    const controller = new AbortController();
    setIsLoadingModels(true);
    setModelListError("");
    setOpenRouterModels([]);
    void loadOpenRouterModels(preferences.openRouterApiKey, controller.signal)
      .then(setOpenRouterModels)
      .catch((error) => {
        if (!controller.signal.aborted) {
          setModelListError(
            error instanceof Error ? error.message : "Could not load models.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingModels(false);
      });
    return () => controller.abort();
  }, [values.generationProvider, preferences.openRouterApiKey]);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    void saveLastUsedSettings(extractRememberedSettings(values));
  }, [
    isBootstrapping,
    values.purpose,
    values.enhancement,
    values.tone,
    values.customPrompt,
    values.model,
    values.generationProvider,
    values.providerModel,
    values.creativity,
  ]);

  async function handleGenerate(nextValues: FormValues, correction?: string) {
    if (requestRef.current) return;
    if (!nextValues.draft.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Draft is required",
        message: "Paste or type the text you want to improve.",
      });
      return;
    }

    if (
      nextValues.generationProvider === "raycast" &&
      !environment.canAccess(AI)
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast AI access required",
        message:
          "This extension needs access to Raycast's AI API. Check your Raycast Pro subscription and Settings > AI.",
      });
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setIsSubmitting(true);
    let progressToast: Toast | undefined;

    try {
      progressToast = await showToast({
        style: Toast.Style.Animated,
        title: correction ? "Refining text" : "Enhancing text",
        message: getProviderSummary({
          ...preferences,
          generationProvider: nextValues.generationProvider,
          providerModel: nextValues.providerModel,
        }),
      });
      const prompt = buildPrompt(nextValues, session?.result, correction);
      const creativity = getCreativity(nextValues.creativity);
      let usedAutomaticModel = nextValues.model === "automatic";
      let answer: ProviderAnswer;

      if (nextValues.generationProvider !== "raycast") {
        answer = await askProvider(
          prompt,
          {
            ...preferences,
            generationProvider: nextValues.generationProvider,
            providerModel: nextValues.providerModel,
          },
          controller.signal,
        );
      } else {
        try {
          const model = getModel(nextValues.model);
          const text = await AI.ask(prompt, {
            ...(model ? { model } : {}),
            creativity,
            signal: controller.signal,
          });
          answer = { text };
        } catch (error) {
          if (
            nextValues.model !== "automatic" &&
            error instanceof Error &&
            /no model found/i.test(error.message)
          ) {
            const text = await AI.ask(prompt, {
              creativity,
              signal: controller.signal,
            });
            answer = { text };
            usedAutomaticModel = true;
          } else {
            throw error;
          }
        }
      }

      if (controller.signal.aborted) return;

      if (!answer.text.trim()) {
        throw new Error(
          "The selected provider returned an empty response. Please try again.",
        );
      }

      const effectiveValues =
        nextValues.generationProvider === "raycast" && usedAutomaticModel
          ? { ...nextValues, model: "automatic" as const }
          : nextValues;
      if (
        nextValues.generationProvider === "raycast" &&
        usedAutomaticModel &&
        nextValues.model !== "automatic"
      ) {
        setValues(effectiveValues);
        setSelectedPresetId(NO_PRESET);
      }
      const { text: result, incompleteReason } = answer;
      setSession({ values: effectiveValues, result, incompleteReason });
      setCorrectionPrompt("");
      setIsCorrectionMode(false);

      let copied = false;
      let historySaved = incompleteReason
        ? true
        : !(preferences.saveGenerationHistory ?? true);
      try {
        if (!incompleteReason && (preferences.autoCopyResult ?? true)) {
          await Clipboard.copy(result);
          copied = true;
        }
      } catch {
        // Keep the generated result visible if clipboard access fails.
      }
      if (!incompleteReason && (preferences.saveGenerationHistory ?? true)) {
        try {
          await appendHistory({
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            values: effectiveValues,
            result,
          });
          historySaved = true;
        } catch {
          // Keep the generated result visible if history storage fails.
        }
      }

      const notices = [
        incompleteReason
          ? `${incompleteReason} Review the partial result; automatic copy and history were skipped.`
          : undefined,
        nextValues.generationProvider === "raycast" &&
        usedAutomaticModel &&
        nextValues.model !== "automatic"
          ? "Selected model was unavailable; Raycast chose another."
          : undefined,
        !incompleteReason && (preferences.autoCopyResult ?? true) && !copied
          ? "Could not copy to clipboard."
          : undefined,
        !historySaved ? "Could not save to history." : undefined,
      ].filter(Boolean);
      await progressToast.hide();
      progressToast = undefined;
      await showToast({
        style: notices.length ? Toast.Style.Failure : Toast.Style.Success,
        title: incompleteReason
          ? "Response may be incomplete"
          : correction
            ? "Text regenerated"
            : "Text enhanced",
        message: notices.length
          ? notices.join(" ")
          : copied
            ? "The result was copied to your clipboard."
            : "The result is ready.",
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      const rawMessage =
        error instanceof Error ? error.message : "Unknown generation error";
      const message =
        nextValues.generationProvider === "raycast" &&
        /no model found/i.test(rawMessage)
          ? "Raycast's Extension AI API could not find a model for this account. In Settings > AI > Models & Providers, enable a Raycast model. Local models cannot power extension AI requests."
          : nextValues.generationProvider === "raycast" &&
              needsAccessGuidance(rawMessage)
            ? getModelAccessErrorMessage(nextValues.model)
            : rawMessage;

      await progressToast?.hide();
      progressToast = undefined;
      await showToast({
        style: Toast.Style.Failure,
        title: "Generation failed",
        message,
      });
    } finally {
      await progressToast?.hide();
      requestRef.current = null;
      setIsSubmitting(false);
    }
  }

  async function handlePresetChange(presetId: string) {
    setSelectedPresetId(presetId);

    if (presetId === NO_PRESET) {
      return;
    }

    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    const nextRememberedSettings: RememberedSettings = {
      purpose: preset.purpose,
      enhancement: preset.enhancement,
      tone: preset.tone,
      customPrompt: preset.customPrompt,
      model: preset.model,
      generationProvider: preset.generationProvider,
      providerModel: preset.providerModel,
      creativity: preset.creativity,
    };
    setValues((current) => ({
      ...current,
      ...nextRememberedSettings,
    }));
  }

  async function createPreset(name: string) {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return false;
    }

    const nextPreset: SavedPreset = {
      id: crypto.randomUUID(),
      name: trimmedName,
      purpose: values.purpose,
      enhancement: values.enhancement,
      tone: values.tone,
      customPrompt: values.customPrompt,
      model: values.model,
      generationProvider: values.generationProvider,
      providerModel: values.providerModel,
      creativity: values.creativity,
    };

    const nextPresets = sortPresets([...presets, nextPreset]);
    await savePresets(nextPresets);
    setPresets(nextPresets);
    setSelectedPresetId(nextPreset.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Preset saved",
      message: `Saved "${trimmedName}".`,
    });
    return true;
  }

  async function deleteSelectedPreset() {
    if (!selectedPreset) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No preset selected",
      });
      return;
    }

    const nextPresets = presets.filter(
      (preset) => preset.id !== selectedPreset.id,
    );
    await savePresets(nextPresets);
    setPresets(nextPresets);
    setSelectedPresetId(NO_PRESET);
    await showToast({
      style: Toast.Style.Success,
      title: "Preset deleted",
      message: `Removed "${selectedPreset.name}".`,
    });
  }

  function updateCustomValues(
    updater: (current: FormValues) => FormValues,
    options?: { keepPreset?: boolean },
  ) {
    setValues((current) => {
      const nextValues = updater(current);

      if (options?.keepPreset) {
        return nextValues;
      }

      setSelectedPresetId((currentPresetId) => {
        if (currentPresetId === NO_PRESET) {
          return currentPresetId;
        }

        const currentPreset = presets.find(
          (preset) => preset.id === currentPresetId,
        );
        if (!currentPreset) {
          return NO_PRESET;
        }

        return matchesPreset(nextValues!, currentPreset)
          ? currentPresetId
          : NO_PRESET;
      });

      return nextValues;
    });
  }

  async function resetSettingsToDefaults() {
    const currentDraft = values.draft;
    const resetValues = { ...defaultValues, draft: currentDraft };
    setSelectedPresetId(NO_PRESET);
    setValues(resetValues);
    await clearLastUsedSettings();
    await showToast({
      style: Toast.Style.Success,
      title: "Settings reset",
      message: "Remembered settings were cleared and defaults were restored.",
    });
  }

  if (session) {
    if (isCorrectionMode) {
      return (
        <Form
          isLoading={isSubmitting}
          navigationTitle="Refine Generated Text"
          actions={
            <ActionPanel>
              {isSubmitting ? (
                <Action
                  title="Cancel Generation"
                  icon={Icon.XMarkCircle}
                  onAction={() => requestRef.current?.abort()}
                />
              ) : (
                <Action.SubmitForm
                  title="Regenerate with Correction"
                  icon={Icon.Wand}
                  onSubmit={async () => {
                    await handleGenerate(session.values, correctionPrompt);
                  }}
                />
              )}
              <Action
                title="Back to Result"
                icon={Icon.ArrowLeft}
                onAction={() => {
                  setIsCorrectionMode(false);
                }}
              />
            </ActionPanel>
          }
        >
          <Form.Description
            title="Current Output"
            text="Add a follow-up instruction like “make it shorter”, “sound warmer”, or “keep it more direct”."
          />
          <Form.TextArea
            id="correctionPrompt"
            title="Correction Prompt"
            placeholder="Example: Make it shorter and more confident."
            value={correctionPrompt}
            onChange={setCorrectionPrompt}
          />
        </Form>
      );
    }

    return (
      <Detail
        isLoading={isSubmitting}
        navigationTitle="Enhanced Text"
        markdown={renderResultMarkdown(
          session.result,
          session.incompleteReason,
        )}
        actions={
          <ActionPanel>
            {isSubmitting ? (
              <Action
                title="Cancel Generation"
                icon={Icon.XMarkCircle}
                onAction={() => requestRef.current?.abort()}
              />
            ) : null}
            <Action.Paste title="Paste Result" content={session.result} />
            <Action.CopyToClipboard
              title="Copy Result Again"
              content={session.result}
            />
            <Action.Push
              title="Compare with Original"
              icon={Icon.Text}
              target={
                <CompareDetail
                  original={session.values.draft}
                  result={session.result}
                  incompleteReason={session.incompleteReason}
                />
              }
            />
            <Action
              title="Regenerate"
              icon={Icon.RotateClockwise}
              onAction={async () => {
                await handleGenerate(session.values);
              }}
            />
            <Action
              title="Regenerate with Correction"
              icon={Icon.Pencil}
              onAction={() => {
                setIsCorrectionMode(true);
              }}
            />
            <Action
              title="Edit Original Inputs"
              icon={Icon.Text}
              onAction={() => {
                setValues(session.values);
                setSession(null);
                setIsCorrectionMode(false);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isBootstrapping || isSubmitting}
      navigationTitle="Enhance Text"
      actions={
        <ActionPanel>
          {isSubmitting ? (
            <Action
              title="Cancel Generation"
              icon={Icon.XMarkCircle}
              onAction={() => requestRef.current?.abort()}
            />
          ) : (
            <Action.SubmitForm
              title={
                (preferences.autoCopyResult ?? true)
                  ? "Enhance and Copy"
                  : "Enhance Text"
              }
              icon={Icon.Wand}
              onSubmit={async () => {
                await handleGenerate(values);
              }}
            />
          )}
          <Action.Push
            title="Save Current Settings as Preset"
            icon={Icon.SaveDocument}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<SavePresetForm onSave={createPreset} />}
          />
          <Action
            title="Delete Selected Preset"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={deleteSelectedPreset}
          />
          <Action
            title="Use Current Clipboard"
            icon={Icon.Clipboard}
            onAction={async () => {
              const clipboardText = await Clipboard.readText();
              if (clipboardText?.trim()) {
                updateCustomValues(
                  (current) => ({ ...current, draft: clipboardText }),
                  { keepPreset: true },
                );
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Clipboard is empty",
                });
              }
            }}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          <Action
            title="Reset Settings to Defaults"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={resetSettingsToDefaults}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Flow"
        text="Selected text is loaded first, then clipboard as fallback. Choose a preset or leave it on No Preset and adjust everything manually."
      />
      <Form.TextArea
        id="draft"
        title="Draft"
        placeholder="Paste your raw draft here"
        value={values.draft}
        onChange={(draft) =>
          updateCustomValues((current) => ({ ...current, draft }), {
            keepPreset: true,
          })
        }
      />
      <Form.Dropdown
        id="preset"
        title="Preset"
        value={selectedPresetId}
        onChange={handlePresetChange}
      >
        <Form.Dropdown.Item value={NO_PRESET} title="No Preset" />
        {presets.map((preset) => (
          <Form.Dropdown.Item
            key={preset.id}
            value={preset.id}
            title={preset.name}
          />
        ))}
      </Form.Dropdown>
      <Form.Description
        title="Preset Status"
        text={
          selectedPreset
            ? `Using "${selectedPreset.name}". Changing a saved setting switches back to No Preset.`
            : "Using custom settings. Last used settings are remembered; use Cmd+Shift+R to reset back to extension defaults."
        }
      />
      <Form.Dropdown
        id="purpose"
        title="Purpose"
        value={values.purpose}
        onChange={(purpose) =>
          updateCustomValues((current) => ({
            ...current,
            purpose: purpose as PurposeId,
          }))
        }
      >
        {PURPOSES.map((purpose) => (
          <Form.Dropdown.Item
            key={purpose.id}
            value={purpose.id}
            title={purpose.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="enhancement"
        title="Enhancement"
        value={values.enhancement}
        onChange={(enhancement) =>
          updateCustomValues((current) => ({
            ...current,
            enhancement: enhancement as EnhancementId,
          }))
        }
      >
        {ENHANCEMENTS.map((enhancement) => (
          <Form.Dropdown.Item
            key={enhancement.id}
            value={enhancement.id}
            title={enhancement.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="tone"
        title="Tone"
        value={values.tone}
        onChange={(tone) =>
          updateCustomValues((current) => ({
            ...current,
            tone: tone as ToneId,
          }))
        }
      >
        {TONES.map((tone) => (
          <Form.Dropdown.Item
            key={tone.id}
            value={tone.id}
            title={tone.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="generationProvider"
        title="AI Provider"
        value={values.generationProvider}
        onChange={(provider) =>
          updateCustomValues((current) => ({
            ...current,
            generationProvider: provider as GenerationProvider,
            providerModel: getDefaultProviderModel(
              provider as GenerationProvider,
            ),
          }))
        }
      >
        {PROVIDER_OPTIONS.map((provider) => (
          <Form.Dropdown.Item
            key={provider.id}
            value={provider.id}
            title={provider.name}
          />
        ))}
      </Form.Dropdown>
      {usesRaycastAI ? (
        <Form.Dropdown
          id="model"
          title="Model"
          value={values.model}
          onChange={(model) =>
            updateCustomValues((current) => ({
              ...current,
              model: model as ModelId,
            }))
          }
        >
          <Form.Dropdown.Item
            value="automatic"
            title="Automatic (Raycast chooses)"
          />
          <Form.Dropdown.Section title="Anthropic">
            {MODELS.filter((model) => model.provider === "Anthropic").map(
              (model) => (
                <Form.Dropdown.Item
                  key={model.id}
                  value={model.id}
                  title={model.title}
                />
              ),
            )}
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="OpenAI">
            {MODELS.filter((model) => model.provider === "OpenAI").map(
              (model) => (
                <Form.Dropdown.Item
                  key={model.id}
                  value={model.id}
                  title={model.title}
                />
              ),
            )}
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="Google">
            {MODELS.filter((model) => model.provider === "Google").map(
              (model) => (
                <Form.Dropdown.Item
                  key={model.id}
                  value={model.id}
                  title={model.title}
                />
              ),
            )}
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="Perplexity">
            {MODELS.filter((model) => model.provider === "Perplexity").map(
              (model) => (
                <Form.Dropdown.Item
                  key={model.id}
                  value={model.id}
                  title={model.title}
                />
              ),
            )}
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="Other Providers">
            {MODELS.filter(
              (model) =>
                !["Anthropic", "OpenAI", "Google", "Perplexity"].includes(
                  model.provider,
                ),
            ).map((model) => (
              <Form.Dropdown.Item
                key={model.id}
                value={model.id}
                title={`${model.provider} · ${model.title}`}
              />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : null}
      {!usesRaycastAI ? (
        <>
          <Form.Dropdown
            id="providerModelPicker"
            title="Choose Model"
            value={
              values.providerModel ||
              getDefaultProviderModel(values.generationProvider)
            }
            isLoading={isLoadingModels}
            onChange={(providerModel) =>
              updateCustomValues((current) => ({ ...current, providerModel }))
            }
          >
            {!providerModels.some(
              (model) =>
                model.id ===
                (values.providerModel ||
                  getDefaultProviderModel(values.generationProvider)),
            ) ? (
              <Form.Dropdown.Item
                value={
                  values.providerModel ||
                  getDefaultProviderModel(values.generationProvider)
                }
                title={`${values.providerModel || getDefaultProviderModel(values.generationProvider)} (current)`}
              />
            ) : null}
            {providerModels.map((model) => (
              <Form.Dropdown.Item
                key={model.id}
                value={model.id}
                title={model.name}
                keywords={[model.id]}
              />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="providerModel"
            title="Model ID"
            info="Type a model ID if it is not in the picker."
            value={values.providerModel}
            onChange={(providerModel) =>
              updateCustomValues((current) => ({ ...current, providerModel }))
            }
          />
          {modelListError ? (
            <Form.Description
              title="Model List"
              text={`${modelListError} You can still enter a model ID manually.`}
            />
          ) : null}
        </>
      ) : null}
      <Form.Description
        title="Generation Provider"
        text={
          usesRaycastAI
            ? getModelAccessHint(values.model)
            : getProviderSummary({
                ...preferences,
                generationProvider: values.generationProvider,
                providerModel: values.providerModel,
              })
        }
      />
      <Form.Dropdown
        id="creativity"
        title="Creativity"
        value={values.creativity}
        onChange={(creativity) =>
          updateCustomValues((current) => ({
            ...current,
            creativity: creativity as CreativityId,
          }))
        }
      >
        {CREATIVITY_LEVELS.map((creativity) => (
          <Form.Dropdown.Item
            key={creativity.id}
            value={creativity.id}
            title={creativity.title}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="customPrompt"
        title="Extra Instruction"
        placeholder="Optional: Mention audience, constraints, wording to avoid, etc."
        value={values.customPrompt}
        onChange={(customPrompt) =>
          updateCustomValues((current) => ({ ...current, customPrompt }))
        }
      />
    </Form>
  );
}

function SavePresetForm(props: { onSave: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const { pop } = useNavigation();

  return (
    <Form
      isLoading={isSaving}
      navigationTitle="Save Preset"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preset"
            icon={Icon.SaveDocument}
            onSubmit={async () => {
              const trimmedName = name.trim();

              if (!trimmedName) {
                setNameError("Preset name is required");
                return false;
              }

              setIsSaving(true);
              try {
                const didSave = await props.onSave(trimmedName);
                if (didSave) {
                  pop();
                }
                return didSave;
              } finally {
                setIsSaving(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset Name"
        placeholder="Example: Warm Client Email"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          if (nameError && value.trim()) {
            setNameError(undefined);
          }
        }}
      />
    </Form>
  );
}

function buildPrompt(
  values: FormValues,
  previousResult?: string,
  correction?: string,
) {
  const purpose =
    PURPOSES.find((item) => item.id === values.purpose) ?? PURPOSES[0];
  const enhancement =
    ENHANCEMENTS.find((item) => item.id === values.enhancement) ??
    ENHANCEMENTS[0];
  const tone = TONES.find((item) => item.id === values.tone) ?? TONES[0];

  const instructions = [
    "You are improving a draft for a Raycast text-enhancement command.",
    `Target format: ${purpose.prompt}.`,
    enhancement.prompt,
    tone.prompt,
    values.creativity === "low"
      ? "Keep changes restrained and wording precise."
      : values.creativity === "high"
        ? "Use fresh, expressive wording where it improves the text."
        : "Balance clarity and originality.",
    "Preserve the original intent and any concrete facts unless the user explicitly asks to change them.",
    "Return only the final rewritten text with no explanation, no bullets, and no quotation marks around it.",
  ];

  if (correction?.trim()) {
    instructions.push(`Follow-up correction: ${correction.trim()}`);
  }

  const sections = [instructions.join("\n")];

  if (values.customPrompt.trim()) {
    sections.push(`Additional user guidance:\n${values.customPrompt.trim()}`);
  }

  sections.push(`Original draft:\n${values.draft.trim()}`);

  if (previousResult?.trim()) {
    sections.push(`Previous enhanced version:\n${previousResult.trim()}`);
  }

  return sections.join("\n\n");
}

function getModel(modelId: ModelId) {
  return MODELS.find((model) => model.id === modelId)?.value;
}

function getModelLabel(modelId: ModelId) {
  if (modelId === "automatic") return "Automatic";
  const model = MODELS.find((item) => item.id === modelId);
  if (model) {
    return `${model.provider} · ${model.title}`;
  }
  return modelId;
}

function getModelProvider(modelId: ModelId) {
  return (
    MODELS.find((model) => model.id === modelId)?.provider ??
    "the matching provider"
  );
}

function needsAccessGuidance(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("available credits") ||
    normalized.includes("raycast ai lite") ||
    normalized.includes("upgrade") ||
    normalized.includes("no access") ||
    normalized.includes("not available") ||
    normalized.includes("permission") ||
    normalized.includes("credits")
  );
}

function getModelAccessHint(modelId: ModelId) {
  if (modelId === "automatic") {
    return "Raycast chooses an available model. If generation still fails, check Raycast Settings > AI and update Raycast.";
  }
  const provider = getModelProvider(modelId);

  if (
    provider === "Google" ||
    provider === "Anthropic" ||
    provider === "OpenAI"
  ) {
    return `${provider} model. Use Raycast Pro or configure a ${provider} API key in Raycast Settings > AI. OpenRouter keys do not apply to this provider-specific model.`;
  }

  if (provider === "Perplexity") {
    return "Perplexity model. Availability depends on Raycast AI access and your Raycast AI provider setup.";
  }

  return `${provider} model. Availability depends on Raycast AI access and whether Raycast supports this provider for your account configuration.`;
}

function getModelAccessErrorMessage(modelId: ModelId) {
  const provider = getModelProvider(modelId);
  const label = getModelLabel(modelId);

  if (
    provider === "Google" ||
    provider === "Anthropic" ||
    provider === "OpenAI"
  ) {
    return `${label} requires Raycast Pro or ${provider} BYOK in Raycast Settings > AI. OpenRouter keys do not apply to this provider-specific model.`;
  }

  return `${label} requires Raycast AI access for this provider. Use Raycast Pro or configure the matching provider in Raycast Settings > AI if Raycast supports it.`;
}

function getCreativity(creativityId: CreativityId) {
  return (
    CREATIVITY_LEVELS.find((item) => item.id === creativityId) ??
    CREATIVITY_LEVELS[1]
  ).value;
}

function renderResultMarkdown(result: string, incompleteReason?: string) {
  return [
    "# Enhanced Text",
    "",
    ...(incompleteReason
      ? [`**Response may be incomplete:** ${incompleteReason}`, ""]
      : []),
    "```text",
    result.replace(/```/g, "\\`\\`\\`"),
    "```",
  ].join("\n");
}

function matchesPreset(values: FormValues, preset: SavedPreset) {
  return (
    values.purpose === preset.purpose &&
    values.enhancement === preset.enhancement &&
    values.tone === preset.tone &&
    values.customPrompt === preset.customPrompt &&
    values.model === preset.model &&
    values.generationProvider === preset.generationProvider &&
    values.providerModel === preset.providerModel &&
    values.creativity === preset.creativity
  );
}

function extractRememberedSettings(values: FormValues): RememberedSettings {
  return {
    purpose: values.purpose,
    enhancement: values.enhancement,
    tone: values.tone,
    customPrompt: values.customPrompt,
    model: values.model,
    generationProvider: values.generationProvider,
    providerModel: values.providerModel,
    creativity: values.creativity,
  };
}

function getDefaultFormValues(preferences: Preferences): FormValues {
  return {
    draft: "",
    purpose: preferences.defaultPurpose ?? "general",
    enhancement: preferences.defaultEnhancement ?? "polish",
    tone: preferences.defaultTone ?? "natural",
    customPrompt: preferences.defaultExtraInstruction ?? "",
    model: normalizeModelId(preferences.defaultModel),
    generationProvider: preferences.generationProvider ?? "openrouter",
    providerModel:
      preferences.providerModel?.trim() ||
      getDefaultProviderModel(preferences.generationProvider ?? "openrouter"),
    creativity: preferences.defaultCreativity ?? "balanced",
  };
}
