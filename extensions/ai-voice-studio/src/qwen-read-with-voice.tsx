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
import { buildOptionsAsync, getActiveModelAsync, getModelLabel } from "./api/qwen-tts";
import type { QwenTTSModel, VoiceConfig } from "./api/qwen-tts-types";
import {
  DEFAULT_MODEL,
  LANGUAGE_TYPE_LABELS,
  MODEL_LABELS,
  QWEN_MODELS,
  VOICE_CATEGORIES,
  getHiddenReadWithVoicePicks,
  getReadWithVoicePicks,
  getVoiceSearchKeywords,
  getVoicesByCategory,
} from "./constants/qwen-tts-voices";
import { OpenProviderSetupAction } from "./components/provider-setup-form";
import { AudioPlayer } from "./utils/audio-player";
import { showTTSFailure } from "./utils/qwen-feedback";
import {
  SPEED_STEP,
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
} from "./utils/qwen-playback-state";
import { playChunksWithLookahead } from "./utils/qwen-pipelined-reading";
import { chunkText } from "./utils/qwen-text-chunker";
import { getQwenSettings, setActiveQwenModel } from "./utils/provider-settings";
import { dropQuickReadVoiceOverrideIfInvalid } from "./utils/qwen-voice-preferences";

type SelectionSource = "selection" | "clipboard" | "none";

export default function ReadWithVoice() {
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
  const [defaultPlaybackRate, setDefaultPlaybackRate] = useState("1");
  const [languageType, setLanguageType] = useState<keyof typeof LANGUAGE_TYPE_LABELS>("Auto");
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
        return getVoiceSearchKeywords(voice).some((value) => value.toLowerCase().includes(searchLower));
      }),
    })).filter((item) => item.voices.length > 0);
  }, [searchText, currentModel]);

  const pinnedPicks = useMemo(() => {
    const searchLower = searchText.trim().toLowerCase();

    return getReadWithVoicePicks(currentModel).filter(({ voice, purpose }) => {
      if (!searchLower) return true;
      if (purpose.toLowerCase().includes(searchLower)) return true;
      return getVoiceSearchKeywords(voice).some((value) => value.toLowerCase().includes(searchLower));
    });
  }, [searchText, currentModel]);

  const hiddenPicks = useMemo(
    () => (searchText.trim() ? [] : getHiddenReadWithVoicePicks(currentModel)),
    [searchText, currentModel],
  );
  const hiddenPickPurposes = useMemo(
    () => Array.from(new Set(hiddenPicks.map((pick) => pick.purpose))).join(", "),
    [hiddenPicks],
  );

  const handleModelChange = useCallback(
    async (value: string) => {
      const nextModel = value as QwenTTSModel;
      if (nextModel === currentModel) return;
      try {
        const qwen = await setActiveQwenModel(nextModel);
        await dropQuickReadVoiceOverrideIfInvalid(qwen.model);
        setCurrentModel(qwen.model);
        await showToast({ style: Toast.Style.Success, title: `Model: ${MODEL_LABELS[qwen.model]}` });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not switch model",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [currentModel],
  );

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
    getQwenSettings()
      .then((settings) => {
        setDefaultPlaybackRate(settings.playbackRate);
        setLanguageType(settings.languageType);
      })
      .catch(() => undefined);
    refreshSelection(true).catch(() => undefined);
    refreshSpeed().catch(() => undefined);
    const player = playerRef.current;

    return () => {
      player.cleanup();
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
    const fallback = parseRateString(defaultPlaybackRate);
    const current = (await getSpeedOverride()) ?? fallback;
    const next = await setSpeedOverride(current + SPEED_STEP);
    setSpeed(next);
    await showToast({
      style: Toast.Style.Success,
      title: `Speed ${formatSpeed(next)}`,
      message: "Applies to the next playback",
    });
  }, [defaultPlaybackRate]);

  const handleSpeedDown = useCallback(async () => {
    const fallback = parseRateString(defaultPlaybackRate);
    const current = (await getSpeedOverride()) ?? fallback;
    const next = await setSpeedOverride(current - SPEED_STEP);
    setSpeed(next);
    await showToast({
      style: Toast.Style.Success,
      title: `Speed ${formatSpeed(next)}`,
      message: "Applies to the next playback",
    });
  }, [defaultPlaybackRate]);

  const textPreview = selectedText
    ? selectedText.length > 90
      ? `${selectedText.substring(0, 90)}...`
      : selectedText
    : "No text loaded";

  const effectiveRate = speed ?? parseRateString(defaultPlaybackRate);
  const speedLabel = `${formatSpeed(effectiveRate)}${speed === null ? " (default)" : " (override)"}`;
  const languageLabel = LANGUAGE_TYPE_LABELS[languageType];

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

  const renderVoiceItem = (voice: VoiceConfig, options?: { keyPrefix?: string; purpose?: string }) => (
    <List.Item
      key={`${options?.keyPrefix ?? ""}${voice.id}`}
      title={voice.name}
      subtitle={voice.description}
      icon={voiceIcon(voice)}
      keywords={getVoiceSearchKeywords(voice)}
      accessories={[
        ...(options?.purpose ? [{ tag: { value: options.purpose, color: Color.Purple } }] : []),
        ...(playingVoiceId === voice.id ? [{ tag: { value: "Playing", color: Color.Blue } }] : []),
        ...(voice.recommended ? [{ tag: { value: "Recommended", color: Color.Green } }] : []),
      ]}
      detail={
        <VoiceDetail
          voice={voice}
          model={MODEL_LABELS[currentModel]}
          selectedText={selectedText}
          speedLabel={speedLabel}
          languageLabel={languageLabel}
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
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={loadFromClipboard}
          />
          <Action.CopyToClipboard title="Copy Voice Identifier" content={voice.id} />
          <OpenProviderSetupAction provider="qwen" />
          <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openProviderSettings} />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search Qwen-TTS voices..."
      onSearchTextChange={setSearchText}
      navigationTitle="Read with Qwen-TTS Voice"
      searchBarAccessory={
        <List.Dropdown tooltip="Qwen Model" value={currentModel} onChange={handleModelChange} storeValue={false}>
          {QWEN_MODELS.map((model) => (
            <List.Dropdown.Item key={model} value={model} title={MODEL_LABELS[model]} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.SpeakerOff}
        title="No voices found"
        description={`Try another search term, or switch the model with the dropdown in the top-right. Current model: ${MODEL_LABELS[currentModel]}`}
      />
      <List.Section title="Current Text">
        <List.Item
          title={textPreview}
          subtitle={
            selectedText
              ? `${selectedText.length} characters · ${formatSource(selectionSource)} · ${speedLabel}`
              : `${MODEL_LABELS[currentModel]} · ${languageLabel} · ${speedLabel}`
          }
          icon={selectionSource === "clipboard" ? Icon.Clipboard : Icon.Text}
          detail={
            <SelectionDetail
              selectedText={selectedText}
              model={MODEL_LABELS[currentModel]}
              source={selectionSource}
              speedLabel={speedLabel}
              languageLabel={languageLabel}
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
              <OpenProviderSetupAction provider="qwen" />
              <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openProviderSettings} />
            </ActionPanel>
          }
        />
      </List.Section>

      {pinnedPicks.length > 0 ? (
        <List.Section title="★ My Picks" subtitle={`${pinnedPicks.length} voices`}>
          {pinnedPicks.map(({ voice, purpose }) => renderVoiceItem(voice, { keyPrefix: "pinned-", purpose }))}
        </List.Section>
      ) : null}

      {hiddenPicks.length > 0 ? (
        <List.Section title="More Picks">
          <List.Item
            icon={{ source: Icon.Info, tintColor: Color.Yellow }}
            title={`${hiddenPicks.length} picks need ${MODEL_LABELS[DEFAULT_MODEL]}`}
            subtitle={hiddenPickPurposes}
            accessories={[{ tag: { value: "Switch model", color: Color.Yellow } }]}
            detail={
              <List.Item.Detail
                markdown={`## More voices on ${MODEL_LABELS[DEFAULT_MODEL]}\n\nThese curated picks are not available on **${MODEL_LABELS[currentModel]}**:\n\n${hiddenPicks
                  .map((pick) => `- ${pick.voice.name} · ${pick.purpose}`)
                  .join("\n")}\n\nSwitch the model with the top-right dropdown (or the action below) to use them.`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Switch to ${MODEL_LABELS[DEFAULT_MODEL]}`}
                  icon={Icon.Gauge}
                  onAction={() => handleModelChange(DEFAULT_MODEL)}
                />
                <OpenProviderSetupAction provider="qwen" />
                <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openProviderSettings} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {filteredCategories.map(({ category, voices }) => (
        <List.Section key={category} title={category}>
          {voices.map((voice) => renderVoiceItem(voice))}
        </List.Section>
      ))}
    </List>
  );
}

function openProviderSettings() {
  return openExtensionPreferences();
}

function SelectionDetail({
  selectedText,
  model,
  source,
  speedLabel,
  languageLabel,
}: {
  selectedText: string;
  model: string;
  source: SelectionSource;
  speedLabel: string;
  languageLabel: string;
}) {
  const text = selectedText.trim();
  const markdown = text
    ? `## Current Text\n\n${escapeMarkdown(text.length > 1000 ? `${text.slice(0, 1000)}...` : text)}`
    : "## Select text on macOS, then press Command-R to refresh or paste from clipboard with Command-Shift-V.";

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label title="Language" text={languageLabel} />
          <List.Item.Detail.Metadata.Label title="Source" text={formatSource(source)} />
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
  languageLabel,
}: {
  voice: VoiceConfig;
  model: string;
  selectedText: string;
  speedLabel: string;
  languageLabel: string;
}) {
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(voice.name)}\n\n${escapeMarkdown(voice.description)}\n\nChoose this voice to read the current text with Alibaba Cloud Qwen-TTS.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Voice ID" text={voice.id} />
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label title="Available On" text={formatVoiceModels(voice)} />
          <List.Item.Detail.Metadata.Label title="Language" text={languageLabel} />
          <List.Item.Detail.Metadata.Label title="Speed" text={speedLabel} />
          <List.Item.Detail.Metadata.Label
            title="Selected Text"
            text={selectedText ? `${selectedText.length} characters` : "None"}
          />
          <List.Item.Detail.Metadata.TagList title="Traits">
            <List.Item.Detail.Metadata.TagList.Item text={voice.gender} color={Color.Blue} />
            <List.Item.Detail.Metadata.TagList.Item text={voice.category} color={Color.SecondaryText} />
            <List.Item.Detail.Metadata.TagList.Item text={voice.language} color={Color.SecondaryText} />
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

function formatVoiceModels(voice: VoiceConfig): string {
  return voice.models.map((model) => MODEL_LABELS[model]).join(", ");
}

function formatSource(source: SelectionSource): string {
  if (source === "selection") return "Selection";
  if (source === "clipboard") return "Clipboard";
  return "None";
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}

function previewText(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}
