import { Action, ActionPanel, Clipboard, Color, Icon, List, Toast, getSelectedText, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildOptionsAsync, getActiveModelAsync, getModelLabel } from "./api/mimo-tts";
import type { VoiceConfig } from "./api/mimo-types";
import { DEFAULT_MODEL, MODEL_LABELS, VOICE_CATEGORIES, getVoicesByCategory } from "./constants/mimo-voices";
import { AudioPlayer } from "./utils/audio-player";
import { showTTSFailure } from "./utils/mimo-feedback";
import { chunkText } from "./utils/mimo-text-chunker";
import { playChunksWithLookahead } from "./utils/mimo-pipelined-reading";
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
import { OpenApiKeyPreferencesAction } from "./components/open-api-key-preferences-action";
import { VoiceCategorySections } from "./components/voice-category-sections";
import { VoiceDetail } from "./components/voice-detail";
import { createChunkPlaybackCallbacks, finalizeChunkPlayback } from "./utils/mimo-chunk-playback";
import { escapeMarkdown } from "./utils/mimo-markdown";
import { previewText } from "./utils/mimo-text-preview";

type SelectionSource = "selection" | "clipboard" | "none";

export default function ReadWithVoice() {
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
  const [defaultSpeechRate, setDefaultSpeechRate] = useState("0");
  const [selectedText, setSelectedText] = useState("");
  const [selectionSource, setSelectionSource] = useState<SelectionSource>("none");
  const [isLoading, setIsLoading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [speed, setSpeed] = useState<number | null>(null);
  const playerRef = useRef(new AudioPlayer());

  const filteredCategories = useMemo(() => {
    const searchLower = searchText.trim().toLowerCase();

    return VOICE_CATEGORIES.map((category) => ({
      category,
      voices: getVoicesByCategory(category, currentModel).filter((voice) => {
        if (!searchLower) return true;
        return [voice.name, voice.id, voice.language, voice.description].some((value) =>
          value.toLowerCase().includes(searchLower),
        );
      }),
    })).filter((item) => item.voices.length > 0);
  }, [searchText, currentModel]);

  const refreshSelection = useCallback(async (silent = false): Promise<void> => {
    const text = await getSelectedText().catch(() => "");
    if (text.trim()) {
      setSelectedText(text);
      setSelectionSource("selection");
      if (!silent) {
        await showToast({
          style: Toast.Style.Success,
          title: "Selection refreshed",
          message: `${text.length} characters`,
        });
      }
      return;
    }
    if (!silent) {
      await showToast({ style: Toast.Style.Failure, title: "No text selected" });
    }
  }, []);

  const refreshSpeed = useCallback(async () => {
    setSpeed(await getSpeedOverride());
  }, []);

  useEffect(() => {
    getActiveModelAsync()
      .then(setCurrentModel)
      .catch(() => undefined);
    getMimoSettings()
      .then((settings) => setDefaultSpeechRate(settings.speechRate))
      .catch(() => undefined);
    refreshSelection(true).catch(() => undefined);
    refreshSpeed().catch(() => undefined);

    // handleRead swaps playerRef.current to a fresh AudioPlayer on every run,
    // so cleanup must read the ref at unmount time — not capture the initial player.
    return () => {
      playerRef.current.cleanup();
    };
  }, [refreshSelection, refreshSpeed]);

  const loadFromClipboard = useCallback(async () => {
    const clipboard = (await Clipboard.readText().catch(() => "")) ?? "";
    if (!clipboard.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard contains no text" });
      return;
    }
    setSelectedText(clipboard);
    setSelectionSource("clipboard");
    await showToast({
      style: Toast.Style.Success,
      title: "Loaded from clipboard",
      message: `${clipboard.length} characters`,
    });
  }, []);

  const handleRead = useCallback(
    async (voice: VoiceConfig) => {
      if (!selectedText.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text to read",
          message: "Refresh the selection or paste from the clipboard.",
        });
        return;
      }

      playerRef.current.stopPlayback();
      await clearPlaybackStopRequest();
      const player = new AudioPlayer();
      playerRef.current = player;

      setIsLoading(true);
      setPlayingVoiceId(voice.id);

      try {
        const options = await buildOptionsAsync(voice.id);
        const modelLabel = getModelLabel(options.model);
        const chunks = chunkText(selectedText);
        const totalChunks = chunks.length;

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Synthesizing${totalChunks > 1 ? ` · ${totalChunks} chunks` : ""}`,
          message: `${voice.name} · ${modelLabel}`,
        });

        await setNowPlaying({
          status: "synthesizing",
          voiceId: voice.id,
          voiceName: voice.name,
          modelLabel,
          textPreview: previewText(selectedText),
          totalChunks,
          currentChunk: -1,
          startedAt: Date.now(),
          source: selectionSource === "clipboard" ? "Clipboard" : "Selection",
        });

        await playChunksWithLookahead(
          chunks,
          options,
          player,
          createChunkPlaybackCallbacks({
            toast,
            voiceName: voice.name,
            toastMessage: modelLabel,
            onFirstAudioReady: () => setIsLoading(false),
          }),
        );

        await finalizeChunkPlayback({
          player,
          toast,
          voiceName: voice.name,
          totalChunks,
        });
      } catch (error) {
        await markError(error instanceof Error ? error.message : String(error));
        await showTTSFailure(error);
      } finally {
        setIsLoading(false);
        setPlayingVoiceId(null);
      }
    },
    [selectedText, selectionSource],
  );

  const handleStop = useCallback(async () => {
    playerRef.current.stopPlayback();
    await requestPlaybackStop();
    setPlayingVoiceId(null);
    await clearNowPlaying();
    await showToast({ style: Toast.Style.Success, title: "Playback stopped" });
  }, []);

  const handleSpeedUp = useCallback(async () => {
    const fallback = parseRateString(defaultSpeechRate);
    const current = (await getSpeedOverride()) ?? fallback;
    const next = await setSpeedOverride(current + SPEED_STEP);
    setSpeed(next);
    await showToast({
      style: Toast.Style.Success,
      title: `Speed ${formatSpeed(next)}`,
      message: "Applies to the next playback",
    });
  }, [defaultSpeechRate]);

  const handleSpeedDown = useCallback(async () => {
    const fallback = parseRateString(defaultSpeechRate);
    const current = (await getSpeedOverride()) ?? fallback;
    const next = await setSpeedOverride(current - SPEED_STEP);
    setSpeed(next);
    await showToast({
      style: Toast.Style.Success,
      title: `Speed ${formatSpeed(next)}`,
      message: "Applies to the next playback",
    });
  }, [defaultSpeechRate]);

  const textPreview = selectedText
    ? selectedText.length > 90
      ? `${selectedText.substring(0, 90)}...`
      : selectedText
    : "No text loaded";

  const effectiveRate = speed ?? parseRateString(defaultSpeechRate);
  const speedLabel = `${formatSpeed(effectiveRate)}${speed === null ? " (default)" : " (override)"}`;

  const stopAction = playingVoiceId ? (
    <Action title="Stop Playback" icon={Icon.Stop} shortcut={{ modifiers: ["cmd"], key: "." }} onAction={handleStop} />
  ) : null;

  const speedActions = (
    <>
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
    </>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search MiMo voices..."
      onSearchTextChange={setSearchText}
      navigationTitle="Read with Selected Voice"
    >
      <List.EmptyView
        icon={Icon.SpeakerOff}
        title="No voices found"
        description={`Try another search term or change the model in Setup Voice Defaults. Current model: ${MODEL_LABELS[currentModel]}`}
      />
      <List.Section title="Current Text">
        <List.Item
          title={textPreview}
          subtitle={
            selectedText
              ? `${selectedText.length} characters · ${formatSource(selectionSource)} · ${speedLabel}`
              : `${MODEL_LABELS[currentModel]} · ${speedLabel}`
          }
          icon={selectionSource === "clipboard" ? Icon.Clipboard : Icon.Text}
          detail={
            <SelectionDetail
              selectedText={selectedText}
              model={MODEL_LABELS[currentModel]}
              source={selectionSource}
              speedLabel={speedLabel}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Selection"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => refreshSelection(false)}
              />
              <Action
                title="Paste from Clipboard"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                onAction={loadFromClipboard}
              />
              {stopAction}
              {speedActions}
              <OpenProviderSetupAction provider="mimo" />
              <OpenApiKeyPreferencesAction />
            </ActionPanel>
          }
        />
      </List.Section>

      <VoiceCategorySections
        groups={filteredCategories}
        renderAccessories={(voice) => [
          ...(playingVoiceId === voice.id ? [{ tag: { value: "Playing", color: Color.Blue } }] : []),
          ...(voice.recommended ? [{ tag: { value: "Recommended", color: Color.Green } }] : []),
        ]}
        renderDetail={(voice) => (
          <VoiceDetail
            voice={voice}
            model={MODEL_LABELS[currentModel]}
            footer="Choose this voice to read the current text with MiMo TTS."
            speedLabel={speedLabel}
            selectedText={selectedText}
          />
        )}
        renderActions={(voice) => (
          <ActionPanel>
            <Action title="Read Text" icon={Icon.Play} onAction={() => handleRead(voice)} />
            {stopAction}
            {speedActions}
            <Action
              title="Refresh Selection"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => refreshSelection(false)}
            />
            <Action
              title="Paste from Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={loadFromClipboard}
            />
            <Action.CopyToClipboard title="Copy Voice Identifier" content={voice.id} />
            <OpenProviderSetupAction provider="mimo" />
            <OpenApiKeyPreferencesAction />
          </ActionPanel>
        )}
      />
    </List>
  );
}

function SelectionDetail({
  selectedText,
  model,
  source,
  speedLabel,
}: {
  selectedText: string;
  model: string;
  source: SelectionSource;
  speedLabel: string;
}) {
  const text = selectedText.trim();
  const markdown = text
    ? `## Current Text\n\n${escapeMarkdown(text.length > 1000 ? `${text.slice(0, 1000)}...` : text)}`
    : "## Select text on macOS, then press ⌘R to refresh — or paste from clipboard with ⌘⇧V.";

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label title="Source" text={formatSource(source)} />
          <List.Item.Detail.Metadata.Label title="Length" text={text ? `${text.length} characters` : "None"} />
          <List.Item.Detail.Metadata.Label title="Speed" text={speedLabel} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function formatSource(source: SelectionSource): string {
  if (source === "selection") return "Selection";
  if (source === "clipboard") return "Clipboard";
  return "None";
}
