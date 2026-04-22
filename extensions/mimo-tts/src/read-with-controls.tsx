import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  getSelectedText,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildOptionsFromPrefs, getActiveModel, getModelLabel, TTSApiError } from "./api/mimo-tts";
import {
  EMOTION_TAGS,
  EXPRESSION_TAGS,
  OPENING_STYLE_TAGS,
  PERFORMANCE_PRESETS,
  RHYTHM_TAGS,
  SPEECH_RATE_OPTIONS,
  VOICE_FEATURE_TAGS,
} from "./constants/controls";
import { DEFAULT_VOICE, VOICE_CATEGORIES, getVoicesByCategory, getVoicesForModel } from "./constants/voices";
import { AudioPlayer } from "./utils/audio-player";
import { chunkText } from "./utils/text-chunker";
import { playChunksWithLookahead } from "./utils/pipelined-reading";
import { getActiveQuickReadVoiceId } from "./utils/voice-preferences";

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

export default function ReadWithControls() {
  const currentModel = getActiveModel();
  const availableVoices = useMemo(() => getVoicesForModel(currentModel), [currentModel]);
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState(availableVoices[0]?.id ?? DEFAULT_VOICE);
  const [isLoading, setIsLoading] = useState(false);
  const playerRef = useRef(new AudioPlayer());

  useEffect(() => {
    let mounted = true;

    async function loadDefaults() {
      const [initialText, activeVoice] = await Promise.all([
        loadInitialText(),
        getActiveQuickReadVoiceId().catch(() => ({ voiceId: DEFAULT_VOICE, isOverride: false })),
      ]);

      if (!mounted) return;
      setText(initialText);
      setVoiceId(
        availableVoices.some((voice) => voice.id === activeVoice.voiceId) ? activeVoice.voiceId : DEFAULT_VOICE,
      );
    }

    loadDefaults();

    return () => {
      mounted = false;
      playerRef.current.cleanup();
    };
  }, [availableVoices]);

  const handleSubmit = useCallback(async (values: ControlFormValues) => {
    const textToRead = values.text.trim();
    if (!textToRead) {
      await showToast({ style: Toast.Style.Failure, title: "No text to read" });
      return;
    }

    playerRef.current.stopPlayback();
    const player = new AudioPlayer();
    playerRef.current = player;
    setIsLoading(true);

    try {
      const options = buildOptionsFromPrefs(values.voiceId, {
        speechRate: values.speechRate || "0",
        additionalStylePrompt: joinNaturalInstructions(values.performancePreset, values.directorPrompt),
        openingStyleTags: [...selectedTags(values.openingStyleTags), ...parseCustomTags(values.customAssistantTags)],
        audioEventTags: [
          ...selectedTags(values.rhythmTags),
          ...selectedTags(values.emotionTags),
          ...selectedTags(values.featureTags),
          ...selectedTags(values.expressionTags),
        ],
      });
      const chunks = chunkText(textToRead);

      await showToast({
        style: Toast.Style.Animated,
        title: `Synthesizing ${chunks.length} chunk${chunks.length > 1 ? "s" : ""}`,
        message: `${values.voiceId} · ${getModelLabel(options.model)}`,
      });

      await playChunksWithLookahead(chunks, options, player, {
        onFirstAudioReady: async () => {
          setIsLoading(false);
          await showToast({ style: Toast.Style.Animated, title: "Playing with controls", message: values.voiceId });
        },
      });

      if (!player.isStopped()) {
        await showToast({ style: Toast.Style.Success, title: "Playback complete" });
      }
    } catch (error) {
      await showPlaybackError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStop = useCallback(() => {
    playerRef.current.stopPlayback();
    setIsLoading(false);
    showToast({ style: Toast.Style.Success, title: "Playback stopped" });
  }, []);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Read with Controls"
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm<ControlFormValues> title="Read with Controls" icon={Icon.Play} onSubmit={handleSubmit} />
          {isLoading ? (
            <Action
              title="Stop Playback"
              icon={Icon.Stop}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={handleStop}
            />
          ) : null}
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="MiMo Control"
        text="Natural direction is sent as the user message. Selected tags are injected at the beginning of the assistant text."
      />
      <Form.TextArea
        id="text"
        title="Text"
        value={text}
        onChange={setText}
        placeholder="Select text before opening this command, or paste text here."
        autoFocus={!text}
      />
      <Form.Dropdown id="voiceId" title="Voice" value={voiceId} onChange={setVoiceId} placeholder="Choose a voice">
        {VOICE_CATEGORIES.map((category) => {
          const voices = getVoicesByCategory(category, currentModel);
          if (voices.length === 0) return null;
          return (
            <Form.Dropdown.Section key={category} title={category}>
              {voices.map((voice) => (
                <Form.Dropdown.Item key={voice.id} value={voice.id} title={voice.name} icon={voiceIcon(voice.gender)} />
              ))}
            </Form.Dropdown.Section>
          );
        })}
      </Form.Dropdown>
      <Form.Dropdown id="speechRate" title="Speech Rate" defaultValue="0" storeValue>
        {SPEECH_RATE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="performancePreset"
        title="Natural Preset"
        defaultValue=""
        info="Sent as natural-language control in the user message."
        storeValue
      >
        {PERFORMANCE_PRESETS.map((option) => (
          <Form.Dropdown.Item key={option.title} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description
        title="Opening Style"
        text="These become a single leading style tag, such as (温柔 疲惫 气声). If 唱歌 is selected, it is forced to be the only opening tag."
      />
      <Form.TagPicker id="openingStyleTags" title="Overall Style" placeholder="Choose style tags" storeValue>
        {OPENING_STYLE_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        id="customAssistantTags"
        title="Custom Tags"
        placeholder="e.g. 低语，播报，嘶吼"
        info="Comma-separated tags added to the assistant text prefix."
        storeValue
      />

      <Form.Separator />
      <Form.Description
        title="Audio Events"
        text="These become an audio-event prefix, such as （紧张，深呼吸，气声）."
      />
      <Form.TagPicker id="rhythmTags" title="Pace and Rhythm" placeholder="Breath, pause, speed, volume" storeValue>
        {RHYTHM_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="emotionTags" title="Emotion State" placeholder="Mood and mixed emotions" storeValue>
        {EMOTION_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="featureTags" title="Voice Feature" placeholder="Texture and vocal effects" storeValue>
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
        placeholder="角色：...\n场景：...\n指导：语速、气息、停顿、重音、共鸣位置、音色质感、情绪起伏..."
        info="Sent as natural-language control in the user message."
        enableMarkdown
        storeValue
      />
    </Form>
  );
}

async function loadInitialText(): Promise<string> {
  const selectedText = await getSelectedText().catch(() => "");
  if (selectedText.trim()) return selectedText;
  return (await Clipboard.readText().catch(() => "")) || "";
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

function voiceIcon(gender: string) {
  if (gender === "female") return Icon.Female;
  if (gender === "male") return Icon.Male;
  return Icon.SpeakerHigh;
}

async function showPlaybackError(error: unknown): Promise<void> {
  if (error instanceof TTSApiError) {
    if (error.code === -1 || error.code === 401 || error.code === 403) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Configuration Required",
        message: error.message,
        primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
      });
      return;
    }

    await showToast({ style: Toast.Style.Failure, title: "MiMo TTS Error", message: error.message });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: error instanceof Error ? error.message : String(error),
  });
}
