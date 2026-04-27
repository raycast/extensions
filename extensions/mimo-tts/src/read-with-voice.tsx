import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  getSelectedText,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildOptionsAsync, getActiveModel, getModelLabel } from "./api/mimo-tts";
import type { VoiceConfig } from "./api/types";
import { MODEL_LABELS, VOICE_CATEGORIES, getVoicesByCategory } from "./constants/voices";
import { AudioPlayer } from "./utils/audio-player";
import { showTTSFailure } from "./utils/feedback";
import { chunkText } from "./utils/text-chunker";
import { playChunksWithLookahead } from "./utils/pipelined-reading";
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
} from "./utils/playback-state";
import { getPreferenceValues } from "@raycast/api";

type SelectionSource = "selection" | "clipboard" | "none";

export default function ReadWithVoice() {
  const currentModel = getActiveModel();
  const prefs = getPreferenceValues<Preferences>();
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
        await showToast({ style: Toast.Style.Success, title: "Selection refreshed", message: `${text.length} chars` });
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
    let mounted = true;
    refreshSelection(true).catch(() => undefined);
    refreshSpeed().catch(() => undefined);

    return () => {
      mounted = false;
      void mounted;
      playerRef.current.cleanup();
    };
  }, [refreshSelection, refreshSpeed]);

  const usePastedClipboard = useCallback(async () => {
    const clipboard = (await Clipboard.readText().catch(() => "")) ?? "";
    if (!clipboard.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard has no text" });
      return;
    }
    setSelectedText(clipboard);
    setSelectionSource("clipboard");
    await showToast({
      style: Toast.Style.Success,
      title: "Loaded from clipboard",
      message: `${clipboard.length} chars`,
    });
  }, []);

  const handleRead = useCallback(
    async (voice: VoiceConfig) => {
      if (!selectedText.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text to read",
          message: "Refresh selection or paste from clipboard",
        });
        return;
      }

      playerRef.current.stopPlayback();
      await clearPlaybackStopRequest();
      const player = new AudioPlayer();
      playerRef.current = player;

      setIsLoading(true);
      setPlayingVoiceId(voice.id);

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

      try {
        await playChunksWithLookahead(chunks, options, player, {
          onChunkReady: async (index, total) => {
            const label = total > 1 ? `Playing ${index + 1}/${total} · ${voice.name}` : `Playing · ${voice.name}`;
            toast.title = label;
            toast.message = modelLabel;
            await patchNowPlaying({ status: "playing", currentChunk: index });
          },
          onFirstAudioReady: async () => {
            setIsLoading(false);
          },
        });

        if (player.isStopped()) {
          toast.style = Toast.Style.Success;
          toast.title = "Stopped";
          await markIdle();
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Playback complete";
          toast.message = `${voice.name} · ${totalChunks > 1 ? `${totalChunks} chunks` : "1 chunk"}`;
          await markIdle();
        }
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
    const fallback = parseRateString(prefs.speechRate);
    const current = (await getSpeedOverride()) ?? fallback;
    const next = await setSpeedOverride(current + SPEED_STEP);
    setSpeed(next);
    await showToast({
      style: Toast.Style.Success,
      title: `Speed ${formatSpeed(next)}`,
      message: "Applies to next read",
    });
  }, [prefs.speechRate]);

  const handleSpeedDown = useCallback(async () => {
    const fallback = parseRateString(prefs.speechRate);
    const current = (await getSpeedOverride()) ?? fallback;
    const next = await setSpeedOverride(current - SPEED_STEP);
    setSpeed(next);
    await showToast({
      style: Toast.Style.Success,
      title: `Speed ${formatSpeed(next)}`,
      message: "Applies to next read",
    });
  }, [prefs.speechRate]);

  const textPreview = selectedText
    ? selectedText.length > 90
      ? `${selectedText.substring(0, 90)}...`
      : selectedText
    : "No text loaded";

  const effectiveRate = speed ?? parseRateString(prefs.speechRate);
  const speedLabel = `${formatSpeed(effectiveRate)}${speed === null ? " (preference)" : " (override)"}`;

  const stopAction = playingVoiceId ? (
    <Action title="Stop Playback" icon={Icon.Stop} shortcut={{ modifiers: ["cmd"], key: "." }} onAction={handleStop} />
  ) : null;

  const speedActions = (
    <>
      <Action
        title="Speed up (+0.25x)"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd", "shift"], key: "=" }}
        onAction={handleSpeedUp}
      />
      <Action
        title="Slow Down (-0.25x)"
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
      navigationTitle="Read with MiMo Voice"
    >
      <List.EmptyView
        icon={Icon.SpeakerOff}
        title="No voices found"
        description={`Try another search term or switch model in preferences. Current model: ${MODEL_LABELS[currentModel]}`}
      />
      <List.Section title="Selection">
        <List.Item
          title={textPreview}
          subtitle={
            selectedText
              ? `${selectedText.length} chars · ${selectionSource} · ${speedLabel}`
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
                title="Use Clipboard Text"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                onAction={usePastedClipboard}
              />
              {stopAction}
              {speedActions}
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>

      {filteredCategories.map(({ category, voices }) => (
        <List.Section key={category} title={category}>
          {voices.map((voice) => (
            <List.Item
              key={voice.id}
              title={voice.name}
              subtitle={voice.description}
              icon={voiceIcon(voice)}
              keywords={[voice.id, voice.language, voice.category]}
              accessories={[
                ...(playingVoiceId === voice.id ? [{ tag: { value: "Playing", color: Color.Blue } }] : []),
                ...(voice.recommended ? [{ tag: { value: "Recommended", color: Color.Green } }] : []),
              ]}
              detail={
                <VoiceDetail
                  voice={voice}
                  model={MODEL_LABELS[currentModel]}
                  selectedText={selectedText}
                  speedLabel={speedLabel}
                />
              }
              actions={
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
                    title="Use Clipboard Text"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    onAction={usePastedClipboard}
                  />
                  <Action.CopyToClipboard title="Copy Voice Identifier" content={voice.id} />
                  <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
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
    ? `## Selected Text\n\n${escapeMarkdown(text.length > 1000 ? `${text.slice(0, 1000)}...` : text)}`
    : "## Select text on macOS, then press ⌘R to refresh — or paste from clipboard with ⌘⇧V.";

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label title="Source" text={source === "none" ? "—" : source} />
          <List.Item.Detail.Metadata.Label title="Length" text={text ? `${text.length} characters` : "None"} />
          <List.Item.Detail.Metadata.Label title="Speed" text={speedLabel} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function VoiceDetail({
  voice,
  model,
  selectedText,
  speedLabel,
}: {
  voice: VoiceConfig;
  model: string;
  selectedText: string;
  speedLabel: string;
}) {
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(voice.name)}\n\n${escapeMarkdown(voice.description)}\n\nSelect this voice to read the current text with MiMo TTS.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Voice ID" text={voice.id} />
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label title="Language" text={voice.language} />
          <List.Item.Detail.Metadata.Label title="Speed" text={speedLabel} />
          <List.Item.Detail.Metadata.Label
            title="Selected Text"
            text={selectedText ? `${selectedText.length} characters` : "None"}
          />
          <List.Item.Detail.Metadata.TagList title="Traits">
            <List.Item.Detail.Metadata.TagList.Item text={voice.gender} color={Color.Blue} />
            <List.Item.Detail.Metadata.TagList.Item text={voice.category} color={Color.SecondaryText} />
            {voice.recommended ? (
              <List.Item.Detail.Metadata.TagList.Item text="Recommended" color={Color.Green} />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function voiceIcon(voice: VoiceConfig) {
  if (voice.gender === "female") return Icon.Female;
  if (voice.gender === "male") return Icon.Male;
  return Icon.SpeakerHigh;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}

function previewText(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}
