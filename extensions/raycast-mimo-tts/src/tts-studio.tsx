import { Action, ActionPanel, Clipboard, Form, Icon, Toast, getSelectedText, showToast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildOptionsFromPrefs, getActiveModelAsync, getModelLabel } from "./api/mimo-tts";
import { showTTSFailure } from "./utils/mimo-feedback";
import {
  EMOTION_TAGS,
  EXPRESSION_TAGS,
  OPENING_STYLE_TAGS,
  PERFORMANCE_PRESETS,
  RHYTHM_TAGS,
  SPEECH_RATE_OPTIONS,
  VOICE_FEATURE_TAGS,
} from "./constants/mimo-controls";
import {
  DEFAULT_MODEL,
  VOICE_CATEGORIES,
  getDefaultVoiceForModel,
  getVoiceById,
  getVoicesByCategory,
  getVoicesForModel,
} from "./constants/mimo-voices";
import { AudioPlayer } from "./utils/audio-player";
import { chunkText } from "./utils/mimo-text-chunker";
import { playChunksWithLookahead } from "./utils/mimo-pipelined-reading";
import { getActiveQuickReadVoiceId } from "./utils/mimo-voice-preferences";
import {
  clearNowPlaying,
  clearPlaybackStopRequest,
  formatSpeed,
  getSpeedOverride,
  markError,
  parseRateString,
  requestPlaybackStop,
  setNowPlaying,
  setSpeedOverride,
  SPEED_STEP,
} from "./utils/mimo-playback-state";
import { getMimoSettings } from "./utils/provider-settings";
import { OpenProviderSetupAction } from "./components/provider-setup-form";
import { createChunkPlaybackCallbacks, finalizeChunkPlayback } from "./utils/mimo-chunk-playback";
import { previewText } from "./utils/mimo-text-preview";
import { adjustSpeechRate } from "./utils/mimo-speech-rate";
import { voiceGenderIcon } from "./utils/mimo-voice-ui";

interface ControlFormValues extends Form.Values {
  text: string;
  voiceId: string;
  speechRate: string;
  performancePreset?: string;
  openingStyleTags?: string[];
  rhythmTags?: string[];
  emotionTags?: string[];
  featureTags?: string[];
  expressionTags?: string[];
  customAssistantTags?: string;
  directorPrompt?: string;
}

export default function MiMoStudio() {
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState(getDefaultVoiceForModel(DEFAULT_MODEL));
  const [speechRate, setSpeechRate] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  // Tracked separately from isLoading so the Stop Playback action stays
  // available after the first chunk plays. onFirstAudioReady clears
  // isLoading (spinner), but multi-chunk playback continues; gating Stop
  // on isLoading would remove the action mid-playback.
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(new AudioPlayer());

  useEffect(() => {
    let mounted = true;

    async function loadDefaults() {
      const [initialText, activeVoice, override] = await Promise.all([
        loadInitialText(),
        getActiveQuickReadVoiceId().catch(() => ({
          voiceId: getDefaultVoiceForModel(DEFAULT_MODEL),
          isOverride: false,
        })),
        getSpeedOverride(),
      ]);
      const [model, settings] = await Promise.all([getActiveModelAsync(), getMimoSettings()]);
      const modelVoices = getVoicesForModel(model);

      if (!mounted) return;
      setCurrentModel(model);
      setText(initialText);
      const fallbackVoice = getDefaultVoiceForModel(model);
      setVoiceId(modelVoices.some((voice) => voice.id === activeVoice.voiceId) ? activeVoice.voiceId : fallbackVoice);
      const initialRate = override ?? parseRateString(settings.speechRate);
      setSpeechRate(matchRateOptionValue(initialRate));
    }

    loadDefaults();

    return () => {
      mounted = false;
      playerRef.current.cleanup();
    };
  }, []);

  const handleSubmit = useCallback(async (values: ControlFormValues) => {
    const textToRead = values.text.trim();
    if (!textToRead) {
      await showToast({ style: Toast.Style.Failure, title: "No text to read" });
      return;
    }

    playerRef.current.stopPlayback();
    await clearPlaybackStopRequest();
    const player = new AudioPlayer();
    playerRef.current = player;
    setIsLoading(true);
    setIsPlaying(true);

    try {
      const voiceMeta = getVoiceById(values.voiceId);
      const voiceName = voiceMeta?.name ?? values.voiceId;
      // Studio's rate dropdown is the source of truth for THIS submission;
      // also persist as global override so menu bar / Quick Read agree.
      const rate = parseRateString(values.speechRate);
      await setSpeedOverride(rate);

      const options = await buildOptionsFromPrefs(
        values.voiceId,
        {
          additionalStylePrompt: joinNaturalInstructions(values.performancePreset, values.directorPrompt),
          openingStyleTags: [...selectedTags(values.openingStyleTags), ...parseCustomTags(values.customAssistantTags)],
          audioEventTags: [
            ...selectedTags(values.rhythmTags),
            ...selectedTags(values.emotionTags),
            ...selectedTags(values.featureTags),
            ...selectedTags(values.expressionTags),
          ],
        },
        rate,
      );
      const modelLabel = getModelLabel(options.model);
      const chunks = chunkText(textToRead);
      const totalChunks = chunks.length;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Synthesizing${totalChunks > 1 ? ` · ${totalChunks} chunks` : ""}`,
        message: `${voiceName} · ${modelLabel} · ${formatSpeed(rate)}`,
      });

      await setNowPlaying({
        status: "synthesizing",
        voiceId: values.voiceId,
        voiceName,
        modelLabel,
        textPreview: previewText(textToRead),
        totalChunks,
        currentChunk: -1,
        startedAt: Date.now(),
        source: "TTS Studio",
      });

      await playChunksWithLookahead(
        chunks,
        options,
        player,
        createChunkPlaybackCallbacks({
          toast,
          voiceName,
          toastMessage: `${modelLabel} · ${formatSpeed(rate)}`,
          onFirstAudioReady: () => setIsLoading(false),
        }),
      );

      await finalizeChunkPlayback({
        player,
        toast,
        voiceName,
        totalChunks,
      });
    } catch (error) {
      await markError(error instanceof Error ? error.message : String(error));
      await showTTSFailure(error);
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, []);

  const handleStop = useCallback(async () => {
    playerRef.current.stopPlayback();
    await requestPlaybackStop();
    setIsLoading(false);
    setIsPlaying(false);
    await clearNowPlaying();
    await showToast({ style: Toast.Style.Success, title: "Playback stopped" });
  }, []);

  const handleUseSelectedText = useCallback(async () => {
    const selectedText = await getSelectedText().catch(() => "");
    if (!selectedText.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "No text selected" });
      return;
    }

    setText(selectedText);
    await showToast({ style: Toast.Style.Success, title: "Selected text loaded" });
  }, []);

  const handlePasteClipboard = useCallback(async () => {
    const clipboardText = await Clipboard.readText().catch(() => "");
    if (!clipboardText?.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard contains no text" });
      return;
    }

    setText(clipboardText);
    await showToast({ style: Toast.Style.Success, title: "Clipboard text loaded" });
  }, []);

  const handleClearText = useCallback(async () => {
    setText("");
    await showToast({ style: Toast.Style.Success, title: "Text cleared" });
  }, []);

  const handleSpeedUp = useCallback(async () => {
    await adjustSpeechRate({
      currentRate: speechRate,
      delta: SPEED_STEP,
      onRateChange: (clamped) => setSpeechRate(matchRateOptionValue(clamped)),
    });
  }, [speechRate]);

  const handleSpeedDown = useCallback(async () => {
    await adjustSpeechRate({
      currentRate: speechRate,
      delta: -SPEED_STEP,
      onRateChange: (clamped) => setSpeechRate(matchRateOptionValue(clamped)),
    });
  }, [speechRate]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="TTS Studio"
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm<ControlFormValues> title="Generate and Play" icon={Icon.Play} onSubmit={handleSubmit} />
          <Action
            title="Use Selected Text"
            icon={Icon.TextCursor}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={handleUseSelectedText}
          />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={handlePasteClipboard}
          />
          <Action
            title="Clear Text"
            icon={Icon.Eraser}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={handleClearText}
          />
          <Action
            title="Increase Speed"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd", "shift"], key: "=" }}
            onAction={handleSpeedUp}
          />
          <Action
            title="Decrease Speed"
            icon={Icon.Minus}
            shortcut={{ modifiers: ["cmd", "shift"], key: "-" }}
            onAction={handleSpeedDown}
          />
          {isPlaying ? (
            <Action
              title="Stop Playback"
              icon={Icon.Stop}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={handleStop}
            />
          ) : null}
          <OpenProviderSetupAction provider="mimo" />
        </ActionPanel>
      }
    >
      <Form.Description
        title="TTS Studio"
        text="Generate speech from typed, selected, or pasted text. ⌘⇧= increases speed, ⌘⇧- decreases speed. Speed changes apply to the next playback and to other MiMo commands."
      />
      <Form.TextArea
        id="text"
        title="Text"
        value={text}
        onChange={setText}
        placeholder="Type or paste text here. You can also load the current selection from the action menu."
        autoFocus={!text}
      />
      <Form.Dropdown id="voiceId" title="Voice" value={voiceId} onChange={setVoiceId} placeholder="Choose a voice">
        {VOICE_CATEGORIES.map((category) => {
          const voices = getVoicesByCategory(category, currentModel);
          if (voices.length === 0) return null;
          return (
            <Form.Dropdown.Section key={category} title={category}>
              {voices.map((voice) => (
                <Form.Dropdown.Item
                  key={voice.id}
                  value={voice.id}
                  title={voice.name}
                  icon={voiceGenderIcon(voice.gender)}
                />
              ))}
            </Form.Dropdown.Section>
          );
        })}
      </Form.Dropdown>
      <Form.Dropdown id="speechRate" title="Speech Rate" value={speechRate} onChange={setSpeechRate}>
        {SPEECH_RATE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="performancePreset"
        title="Performance Preset"
        defaultValue=""
        info="Sent to MiMo as speaking instructions."
        storeValue
      >
        {PERFORMANCE_PRESETS.map((option) => (
          <Form.Dropdown.Item key={option.title} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description
        title="Opening Style"
        text="Added as leading style tags, such as gentle, tired, or breathy. If Singing is chosen, it overrides all other opening style tags."
      />
      <Form.TagPicker id="openingStyleTags" title="Overall Style" placeholder="Choose style tags" storeValue>
        {OPENING_STYLE_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        id="customAssistantTags"
        title="Custom Tags"
        placeholder="e.g., whisper, narration, roar"
        info="Comma-separated tags added before the text."
        storeValue
      />

      <Form.Separator />
      <Form.Description
        title="Audio Events"
        text="Added before the text to guide delivery, such as nervous, deep breath, or breathy voice."
      />
      <Form.TagPicker id="rhythmTags" title="Pace and Rhythm" placeholder="Breath, pause, speed, volume" storeValue>
        {RHYTHM_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="emotionTags" title="Emotional State" placeholder="Mood and mixed emotions" storeValue>
        {EMOTION_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="featureTags" title="Vocal Texture" placeholder="Texture and vocal effects" storeValue>
        {VOICE_FEATURE_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="expressionTags" title="Laughing and Crying" placeholder="Laugh, sob, cry" storeValue>
        {EXPRESSION_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} />
        ))}
      </Form.TagPicker>

      <Form.Separator />
      <Form.TextArea
        id="directorPrompt"
        title="Director Prompt"
        placeholder="Role: ...\nScene: ...\nDirection: pace, breath, pauses, stress, resonance, vocal texture, emotional arc..."
        info="Free-form natural-language direction sent to MiMo."
        enableMarkdown
        storeValue
      />
    </Form>
  );
}

async function loadInitialText(): Promise<string> {
  const selectedText = await getSelectedText().catch(() => "");
  if (selectedText.trim()) return selectedText;
  return "";
}

function selectedTags(tags: string[] | undefined): string[] {
  return Array.isArray(tags) ? tags : [];
}

function parseCustomTags(input: string | undefined): string[] {
  return (input ?? "")
    .split(/[，,；;、/]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function joinNaturalInstructions(...items: Array<string | undefined>): string | undefined {
  const instructions = items.map((item) => item?.trim()).filter(Boolean);
  return instructions.length > 0 ? instructions.join("\n") : undefined;
}

/** Pick the dropdown option value (legacy or modern) closest to a given rate. */
function matchRateOptionValue(rate: number): string {
  let best = SPEECH_RATE_OPTIONS[0]?.value ?? "0";
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const option of SPEECH_RATE_OPTIONS) {
    const optionRate = parseRateString(option.value);
    const diff = Math.abs(optionRate - rate);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = option.value;
    }
  }
  return best;
}
