import { Action, ActionPanel, Clipboard, Form, Icon, Toast, getSelectedText, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildOptionsFromPrefs, getModelLabel } from "./api/openai-tts";
import type {
  OpenAITone,
  OpenAIExpressiveness,
  OpenAIDelivery,
  OpenAIAccentFocus,
  OpenAIResponseFormat,
} from "./api/openai-types";
import { showTTSFailure } from "./utils/openai-feedback";
import {
  DEFAULT_MODEL,
  VOICE_CATEGORIES,
  getVoiceById,
  getVoicesByCategory,
  getVoicesForModel,
} from "./constants/openai-voices";
import {
  TONE_OPTIONS,
  EXPRESSIVENESS_OPTIONS,
  DELIVERY_OPTIONS,
  ACCENT_FOCUS_OPTIONS,
  DEFAULT_TONE,
  DEFAULT_EXPRESSIVENESS,
  DEFAULT_DELIVERY,
  DEFAULT_ACCENT_FOCUS,
  composeStyleInstruction,
} from "./constants/openai-style";
import { AudioPlayer } from "./utils/audio-player";
import { chunkText } from "./utils/openai-text-chunker";
import { playChunksWithLookahead } from "./utils/openai-pipelined-reading";
import {
  clearNowPlaying,
  clearPlaybackStopRequest,
  formatSpeed,
  getSpeedOverride,
  markError,
  markIdle,
  parseRateString,
  patchNowPlaying,
  requestPlaybackStop,
  setNowPlaying,
  setSpeedOverride,
  SPEED_STEP,
} from "./utils/openai-playback-state";
import { getOpenAISettings } from "./utils/provider-settings";
import { getActiveQuickReadVoiceId } from "./utils/openai-voice-preferences";
import { runStudioPlayback } from "./utils/studio-playback";
import { OpenProviderSetupAction } from "./components/provider-setup-form";

const PLAYBACK_RATE_OPTIONS = [
  { value: "0.5", title: "0.5x" },
  { value: "0.75", title: "0.75x" },
  { value: "1", title: "1.0x (default)" },
  { value: "1.25", title: "1.25x" },
  { value: "1.5", title: "1.5x" },
  { value: "1.75", title: "1.75x" },
  { value: "2", title: "2.0x" },
];

const FORMAT_OPTIONS = [
  { value: "wav", title: "WAV · lowest latency" },
  { value: "mp3", title: "MP3 · general use" },
  { value: "aac", title: "AAC · compact" },
  { value: "flac", title: "FLAC · lossless" },
  { value: "opus", title: "Opus · streaming" },
];

interface StudioFormValues extends Form.Values {
  text: string;
  voiceId: string;
  playbackRate: string;
  tone: string;
  expressiveness: string;
  delivery: string;
  accentFocus: string;
  responseFormat: string;
  instructions: string;
}

export default function OpenAIStudio() {
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("cedar");
  const [playbackRate, setPlaybackRate] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  // Tracked separately from isLoading so the Stop Playback action stays
  // available after the first chunk plays. onFirstAudioReady clears
  // isLoading (spinner), but multi-chunk playback continues; gating Stop
  // on isLoading would remove the action mid-playback.
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(new AudioPlayer());
  const voices = useMemo(() => getVoicesForModel(DEFAULT_MODEL), []);

  useEffect(() => {
    let mounted = true;

    async function loadDefaults() {
      const [initialText, activeVoice, override, settings] = await Promise.all([
        loadInitialText(),
        getActiveQuickReadVoiceId().catch(() => ({ voiceId: "cedar", isOverride: false })),
        getSpeedOverride(),
        getOpenAISettings(),
      ]);
      if (!mounted) return;
      setText(initialText);
      setVoiceId(voices.some((v) => v.id === activeVoice.voiceId) ? activeVoice.voiceId : "cedar");
      setPlaybackRate(matchRateOptionValue(override ?? parseRateString(settings.playbackRate)));
    }

    loadDefaults();

    return () => {
      mounted = false;
      playerRef.current.cleanup();
    };
  }, [voices]);

  const handleSubmit = useCallback(async (values: StudioFormValues) => {
    await runStudioPlayback({
      buildOptions: async (rate) => {
        const options = await buildOptionsFromPrefs(
          values.voiceId,
          { instructions: values.instructions?.trim() || undefined },
          rate,
        );
        const studioInstruction = composeStyleInstruction({
          tone: values.tone as OpenAITone,
          expressiveness: values.expressiveness as OpenAIExpressiveness,
          delivery: values.delivery as OpenAIDelivery,
          accentFocus: values.accentFocus as OpenAIAccentFocus,
          extraNotes: values.instructions?.trim(),
        });
        options.instructions = [studioInstruction, rateToInstruction(rate)].filter(Boolean).join("\n");
        options.format = (values.responseFormat as OpenAIResponseFormat) || options.format;
        return options;
      },
      chunkText,
      clearPlaybackStopRequest,
      formatSpeed,
      getModelLabel,
      getVoiceName: (voiceId) => getVoiceById(voiceId)?.name ?? voiceId,
      markError,
      markIdle,
      parseRateString,
      patchNowPlaying,
      playChunksWithLookahead,
      playerRef,
      rateValue: values.playbackRate,
      setIsLoading,
      setIsPlaying,
      setNowPlaying,
      setSpeedOverride,
      showTTSFailure,
      source: "OpenAI TTS Studio",
      text: values.text,
      voiceId: values.voiceId,
    });
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
    const next = parseRateString(playbackRate) + SPEED_STEP;
    const clamped = await setSpeedOverride(next);
    setPlaybackRate(matchRateOptionValue(clamped));
    await showToast({ style: Toast.Style.Success, title: `Speed ${formatSpeed(clamped)}` });
  }, [playbackRate]);

  const handleSpeedDown = useCallback(async () => {
    const next = parseRateString(playbackRate) - SPEED_STEP;
    const clamped = await setSpeedOverride(next);
    setPlaybackRate(matchRateOptionValue(clamped));
    await showToast({ style: Toast.Style.Success, title: `Speed ${formatSpeed(clamped)}` });
  }, [playbackRate]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="OpenAI TTS Studio"
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm<StudioFormValues> title="Generate and Play" icon={Icon.Play} onSubmit={handleSubmit} />
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
          <OpenProviderSetupAction provider="openai" />
        </ActionPanel>
      }
    >
      <Form.Description
        title="OpenAI TTS Studio"
        text="Generate speech with GPT-4o Mini TTS. Adjust voice, tone, delivery, and accent per-submission. ⌘⇧= / ⌘⇧- for speed."
      />
      <Form.TextArea
        id="text"
        title="Text"
        value={text}
        onChange={setText}
        placeholder="Type or paste text. Use ⌘⇧S to load selection, ⌘⇧V to paste clipboard."
        autoFocus={!text}
      />
      <Form.Dropdown id="voiceId" title="Voice" value={voiceId} onChange={setVoiceId}>
        {VOICE_CATEGORIES.map((category) => {
          const categoryVoices = getVoicesByCategory(category, DEFAULT_MODEL);
          if (categoryVoices.length === 0) return null;
          return (
            <Form.Dropdown.Section key={category} title={category}>
              {categoryVoices.map((voice) => (
                <Form.Dropdown.Item key={voice.id} value={voice.id} title={voice.name} icon={voiceIcon(voice.gender)} />
              ))}
            </Form.Dropdown.Section>
          );
        })}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description
        title="Narration Style"
        text="Shape how gpt-4o-mini-tts speaks — tone, delivery, emotion, and accent."
      />
      <Form.Dropdown id="tone" title="Tone" defaultValue={DEFAULT_TONE} storeValue>
        {TONE_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.value} value={o.value} title={o.label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="delivery" title="Delivery" defaultValue={DEFAULT_DELIVERY} storeValue>
        {DELIVERY_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.value} value={o.value} title={o.label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="expressiveness" title="Expressiveness" defaultValue={DEFAULT_EXPRESSIVENESS} storeValue>
        {EXPRESSIVENESS_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.value} value={o.value} title={o.label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="accentFocus" title="Accent" defaultValue={DEFAULT_ACCENT_FOCUS} storeValue>
        {ACCENT_FOCUS_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.value} value={o.value} title={o.label} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Dropdown id="playbackRate" title="Speed" value={playbackRate} onChange={setPlaybackRate}>
        {PLAYBACK_RATE_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.value} value={o.value} title={o.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="responseFormat" title="Format" defaultValue="wav" storeValue>
        {FORMAT_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.value} value={o.value} title={o.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="instructions"
        title="Extra Instructions"
        placeholder="Free-form direction for the model, e.g. 'Speak like a news anchor' or 'Whisper the last sentence'"
        info="Appended after the style settings above."
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

function voiceIcon(gender: string) {
  if (gender === "female") return Icon.Female;
  if (gender === "male") return Icon.Male;
  return Icon.SpeakerHigh;
}

function matchRateOptionValue(rate: number): string {
  let best = PLAYBACK_RATE_OPTIONS[0]?.value ?? "1";
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const option of PLAYBACK_RATE_OPTIONS) {
    const diff = Math.abs(Number(option.value) - rate);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = option.value;
    }
  }
  return best;
}

function rateToInstruction(rate: number): string {
  if (rate <= 0.55) return "Speak slowly and calmly, with clear pauses.";
  if (rate <= 0.8) return "Speak at a slightly relaxed pace.";
  if (rate <= 1.05) return "";
  if (rate <= 1.3) return "Speak at a lightly brisk pace while keeping articulation clear.";
  if (rate <= 1.55) return "Speak quickly, but keep the rhythm natural and intelligible.";
  if (rate <= 1.8) return "Speak briskly with crisp articulation and clear delivery.";
  return "Speak very quickly while preserving clear pronunciation.";
}
