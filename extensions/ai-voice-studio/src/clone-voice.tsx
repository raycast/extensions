import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  cloneVoice,
  downloadAudioAsBase64,
  isTokenPlanCompatibleModel,
  TTSApiError,
  uploadAudioFile,
} from "./api/minimax-tts";
import { AudioPlayer } from "./utils/audio-player";
import { setQuickReadVoiceOverride } from "./utils/voice-preferences";
import { lookupUploadCache, rememberUploadCache } from "./utils/upload-cache";

const DEFAULT_PREVIEW_TEXT = "这是一个 MiniMax 克隆音色试听。";
const MODEL_OPTIONS = [
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

interface CloneVoiceFormValues {
  voiceId: string;
  sourceAudio: string[];
  promptAudio: string[];
  promptText: string;
  previewText: string;
  model: string;
  languageBoost: string;
  needNoiseReduction: boolean;
  needVolumeNormalization: boolean;
  aigcWatermark: boolean;
}

interface CloneVoiceResult {
  voiceId: string;
  sourceAudioPath: string;
  promptAudioPath?: string;
  promptText?: string;
  previewText: string;
  model: string;
  languageBoost: string;
  demoAudioUrl?: string;
  inputSensitive?: boolean;
}

type FormErrorKey = "voiceId" | "sourceAudio" | "promptAudio" | "promptText" | "previewText";
type FormErrors = Partial<Record<FormErrorKey, string>>;

export default function CloneVoiceCommand() {
  const prefs = useMemo(() => getPreferenceDefaults(), []);
  const availableModelOptions = useMemo(
    () =>
      prefs.preferTokenPlanModelsOnly
        ? MODEL_OPTIONS.filter((option) => isTokenPlanCompatibleModel(option.value))
        : MODEL_OPTIONS,
    [prefs.preferTokenPlanModelsOnly],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CloneVoiceResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const playerRef = useRef(new AudioPlayer());

  useEffect(() => {
    // Preview clip playback survives view dismissal — no cleanup on unmount.
    return () => {
      // intentionally empty
    };
  }, []);

  function clearError(field: FormErrorKey) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(values: CloneVoiceFormValues) {
    const sourceAudioPath = values.sourceAudio[0];
    const promptAudioPath = values.promptAudio[0];
    const voiceId = values.voiceId.trim();
    const previewText = values.previewText.trim();
    const promptText = values.promptText.trim();

    const validation = validateCloneForm({
      voiceId,
      sourceAudioPath,
      promptAudioPath,
      promptText,
      previewText,
    });

    if (!validation.ok) {
      setErrors(validation.errors);
      const firstMessage = Object.values(validation.errors)[0];
      if (firstMessage) {
        await showToast({ style: Toast.Style.Failure, title: "Check the highlighted fields", message: firstMessage });
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const sourceFileId = await uploadCachedAudio(sourceAudioPath, "voice_clone", "source audio");

      let promptAudioFileId: number | undefined;
      if (promptAudioPath) {
        promptAudioFileId = await uploadCachedAudio(promptAudioPath, "prompt_audio", "prompt audio");
      }

      await showToast({ style: Toast.Style.Animated, title: "Cloning voice..." });
      const cloneResult = await cloneVoice({
        file_id: sourceFileId,
        voice_id: voiceId,
        text: previewText,
        model: values.model,
        language_boost: values.languageBoost,
        clone_prompt: promptAudioFileId
          ? {
              prompt_audio: promptAudioFileId,
              prompt_text: promptText,
            }
          : undefined,
        need_noise_reduction: values.needNoiseReduction,
        need_volume_normalization: values.needVolumeNormalization,
        aigc_watermark: values.aigcWatermark,
      });

      setResult({
        voiceId,
        sourceAudioPath,
        promptAudioPath: promptAudioPath || undefined,
        promptText: promptText || undefined,
        previewText,
        model: values.model,
        languageBoost: values.languageBoost,
        demoAudioUrl: cloneResult.demo_audio || undefined,
        inputSensitive: cloneResult.input_sensitive,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Voice cloned",
        message: cloneResult.demo_audio ? "Preview audio is ready." : voiceId,
      });
    } catch (error) {
      await presentError(error, "Voice clone failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePreviewAudio() {
    if (!result?.demoAudioUrl) return;

    playerRef.current.stopPlayback();
    const player = new AudioPlayer();
    playerRef.current = player;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Downloading preview audio..." });
      const audio = await downloadAudioAsBase64(result.demoAudioUrl);
      await player.playAudio(audio);
      await showToast({ style: Toast.Style.Success, title: "Preview playback complete" });
    } catch (error) {
      await presentError(error, "Preview playback failed");
    }
  }

  async function handleUseAsQuickReadVoice() {
    if (!result) return;
    await setQuickReadVoiceOverride(result.voiceId);
    await showToast({
      style: Toast.Style.Success,
      title: "Quick Read voice updated",
      message: result.voiceId,
    });
  }

  if (result) {
    return (
      <Detail
        navigationTitle="Clone Voice Result"
        markdown={buildResultMarkdown(result)}
        actions={
          <ActionPanel>
            {result.demoAudioUrl && (
              <Action title="Play Preview Audio" icon={Icon.Play} onAction={handlePreviewAudio} />
            )}
            <Action
              title="Set as Quick Read Voice"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={handleUseAsQuickReadVoice}
            />
            {result.demoAudioUrl && (
              <Action.OpenInBrowser title="Open Preview Audio URL" url={result.demoAudioUrl} icon={Icon.Link} />
            )}
            <Action.CopyToClipboard
              title="Copy Voice Id"
              content={result.voiceId}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action
              title="Clone Another Voice"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => setResult(null)}
            />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Clone Voice"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Cloned Voice" icon={Icon.Wand} onSubmit={handleSubmit} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description text="Upload a source voice sample, optionally add a short prompt sample, and generate a cloned MiniMax voice for later TTS use." />
      <Form.TextField
        id="voiceId"
        title="Voice ID"
        placeholder="Example: MinimaxVoice01"
        info="8-256 chars. Start with a letter; only letters, numbers, - and _ are allowed."
        error={errors.voiceId}
        onChange={() => clearError("voiceId")}
      />
      <Form.FilePicker
        id="sourceAudio"
        title="Source Audio"
        allowMultipleSelection={false}
        info="Required. mp3, m4a, or wav. MiniMax expects 10s to 5m and up to 20 MB."
        error={errors.sourceAudio}
        onChange={() => clearError("sourceAudio")}
      />
      <Form.FilePicker
        id="promptAudio"
        title="Prompt Audio"
        allowMultipleSelection={false}
        info="Optional. Use a short reference clip under 8 seconds to improve similarity."
        error={errors.promptAudio}
        onChange={() => {
          clearError("promptAudio");
          clearError("promptText");
        }}
      />
      <Form.TextArea
        id="promptText"
        title="Prompt Text"
        placeholder="Required if Prompt Audio is selected"
        error={errors.promptText}
        onChange={() => clearError("promptText")}
      />
      <Form.TextArea
        id="previewText"
        title="Preview Text"
        defaultValue={DEFAULT_PREVIEW_TEXT}
        placeholder="Used to generate the demo audio returned by MiniMax"
        error={errors.previewText}
        onChange={() => clearError("previewText")}
      />
      <Form.Dropdown id="model" title="Preview Model" defaultValue={prefs.model}>
        {availableModelOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="languageBoost" title="Language Boost" defaultValue={prefs.languageBoost}>
        {LANGUAGE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="needNoiseReduction" label="Enable Noise Reduction" defaultValue={false} />
      <Form.Checkbox id="needVolumeNormalization" label="Enable Volume Normalization" defaultValue={false} />
      <Form.Checkbox id="aigcWatermark" label="Add AIGC Watermark to Preview Audio" defaultValue={false} />
    </Form>
  );
}

async function uploadCachedAudio(filePath: string, purpose: "voice_clone" | "prompt_audio", label: string) {
  const cached = await lookupUploadCache(filePath, purpose);
  if (cached !== null) {
    await showToast({
      style: Toast.Style.Animated,
      title: `Reusing previously uploaded ${label}`,
    });
    return cached;
  }

  await showToast({ style: Toast.Style.Animated, title: `Uploading ${label}...` });
  const fileId = await uploadAudioFile(filePath, purpose);
  await rememberUploadCache(filePath, purpose, fileId);
  return fileId;
}

function validateCloneForm(input: {
  voiceId: string;
  sourceAudioPath?: string;
  promptAudioPath?: string;
  promptText: string;
  previewText: string;
}): { ok: true } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};

  if (!input.voiceId) {
    errors.voiceId = "Voice ID is required.";
  } else if (input.voiceId.length < 8 || input.voiceId.length > 256) {
    errors.voiceId = "Voice ID must be between 8 and 256 characters.";
  } else if (!/^[A-Za-z][A-Za-z0-9_-]*[A-Za-z0-9]$/.test(input.voiceId)) {
    errors.voiceId = "Voice ID must start with a letter and cannot end in '-' or '_'.";
  }

  if (!input.sourceAudioPath) {
    errors.sourceAudio = "Source audio is required.";
  }

  if (!input.previewText) {
    errors.previewText = "Preview text is required.";
  }

  if (input.promptAudioPath && !input.promptText) {
    errors.promptText = "Prompt text is required when Prompt Audio is set.";
  } else if (!input.promptAudioPath && input.promptText) {
    errors.promptAudio = "Prompt audio is required when Prompt Text is set.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

function buildResultMarkdown(result: CloneVoiceResult): string {
  const nextSteps = [
    "## Next steps",
    "",
    result.demoAudioUrl
      ? "- Press **⏎** to play the MiniMax-generated preview clip."
      : "- Press **⏎** to set this voice as the Quick Read default.",
    "- **⌘⏎** sets this as your Quick Read default; trigger Quick Read to hear it.",
    "- **⌘⇧.** copies the Voice ID for use elsewhere (e.g. as a `customDefaultVoice`).",
    "",
  ];

  return [
    "# Cloned Voice Ready",
    "",
    ...nextSteps,
    "## Details",
    "",
    `- **Voice ID:** \`${result.voiceId}\``,
    `- **Preview Model:** \`${result.model}\``,
    `- **Language Boost:** \`${result.languageBoost}\``,
    `- **Source Audio:** \`${result.sourceAudioPath}\``,
    result.promptAudioPath ? `- **Prompt Audio:** \`${result.promptAudioPath}\`` : "- **Prompt Audio:** Not provided",
    result.promptText ? `- **Prompt Text:** ${result.promptText}` : "- **Prompt Text:** Not provided",
    `- **Preview Text:** ${result.previewText}`,
    result.demoAudioUrl ? `- **Preview Audio URL:** ${result.demoAudioUrl}` : "- **Preview Audio URL:** Not returned",
    result.inputSensitive
      ? "- **Safety Result:** Input flagged by MiniMax safety checks."
      : "- **Safety Result:** Not flagged",
    "",
    "> MiniMax may delete a cloned voice that hasn't been used within 7 days.",
  ].join("\n");
}

function getPreferenceDefaults(): { model: string; languageBoost: string; preferTokenPlanModelsOnly: boolean } {
  const prefs = getPreferenceValues<Preferences>();
  const preferTokenPlanModelsOnly =
    prefs.authMode === "token-plan" || (!!prefs.tokenPlanKey?.trim() && !prefs.openPlatformApiKey?.trim());
  const preferredModel =
    preferTokenPlanModelsOnly && !isTokenPlanCompatibleModel(prefs.model || "speech-2.8-hd")
      ? "speech-2.8-hd"
      : prefs.model || "speech-2.8-hd";

  return {
    model: preferredModel,
    languageBoost: prefs.languageBoost || "auto",
    preferTokenPlanModelsOnly,
  };
}

async function presentError(error: unknown, title: string) {
  if (error instanceof TTSApiError) {
    if (error.code === -1 || error.code === -6) {
      await showToast({
        style: Toast.Style.Failure,
        title: error.code === -1 ? "Configuration Required" : "Model Not Available",
        message: error.message,
        primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
      });
      return;
    }
    await showToast({ style: Toast.Style.Failure, title, message: error.message });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
