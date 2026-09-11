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
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "../utils/audio-player";
import type { TTSProvider } from "../utils/provider";
import type { NowPlayingState } from "../utils/shared-playback-state";
import { OpenProviderSetupAction } from "./provider-setup-form";

type SelectionSource = "selection" | "clipboard" | "none";

interface ReadVoice<Model extends string> {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  category: string;
  description: string;
  models: Model[];
  language?: string;
  recommended?: boolean;
}

interface ReadOptions<Model extends string> {
  model: Model;
  voice: string;
  format: string;
  playbackRate: number;
}

interface ChunkPlaybackCallbacks {
  onChunkReady: (index: number, total: number) => Promise<void>;
  onFirstAudioReady: () => Promise<void>;
}

interface PlaybackApi {
  clearNowPlaying: () => Promise<void>;
  clearPlaybackStopRequest: () => Promise<void>;
  formatSpeed: (rate: number) => string;
  getSpeedOverride: () => Promise<number | null>;
  markError: (message: string) => Promise<void>;
  markIdle: () => Promise<void>;
  parseRateString: (value: string | undefined | null) => number;
  patchNowPlaying: (patch: Partial<NowPlayingState>) => Promise<NowPlayingState | null>;
  requestPlaybackStop: () => Promise<void>;
  setNowPlaying: (state: NowPlayingState) => Promise<void>;
  setSpeedOverride: (rate: number) => Promise<number>;
  speedStep: number;
}

interface ProviderReadWithVoiceConfig<
  Model extends string,
  Voice extends ReadVoice<Model>,
  Options extends ReadOptions<Model>,
  Settings,
> {
  buildOptions: (voiceId: string) => Promise<Options>;
  categories: readonly string[];
  chunkText: (text: string) => string[];
  defaultModel: Model;
  emptyDescription: (modelLabel: string) => string;
  getActiveModel: () => Promise<Model>;
  getKeywords: (voice: Voice) => string[];
  getModelLabel: (model: Model) => string;
  getSettings: () => Promise<Settings>;
  getVoicesByCategory: (category: string, model?: Model) => Voice[];
  modelLabels: Record<Model, string>;
  navigationTitle: string;
  playback: PlaybackApi;
  playChunksWithLookahead: (
    chunks: string[],
    options: Options,
    player: AudioPlayer,
    callbacks: ChunkPlaybackCallbacks,
  ) => Promise<void>;
  provider: TTSProvider;
  providerLabel: string;
  rateSetting: (settings: Settings) => string | undefined | null;
  searchBarPlaceholder: string;
  showTTSFailure: (error: unknown, title?: string) => Promise<void>;
  voiceMetadata?: (voice: Voice) => Array<{ title: string; text: string }>;
}

export function ProviderReadWithVoice<
  Model extends string,
  Voice extends ReadVoice<Model>,
  Options extends ReadOptions<Model>,
  Settings,
>({ config }: { config: ProviderReadWithVoiceConfig<Model, Voice, Options, Settings> }) {
  const [currentModel, setCurrentModel] = useState(config.defaultModel);
  const [defaultRate, setDefaultRate] = useState("1");
  const [selectedText, setSelectedText] = useState("");
  const [selectionSource, setSelectionSource] = useState<SelectionSource>("none");
  const [isLoading, setIsLoading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [speed, setSpeed] = useState<number | null>(null);
  const playerRef = useRef(new AudioPlayer());

  const filteredCategories = useMemo(() => {
    const searchLower = searchText.trim().toLowerCase();

    return config.categories
      .map((category) => ({
        category,
        voices: config.getVoicesByCategory(category, currentModel).filter((voice) => {
          if (!searchLower) return true;
          return config.getKeywords(voice).some((value) => value.toLowerCase().includes(searchLower));
        }),
      }))
      .filter((item) => item.voices.length > 0);
  }, [config, searchText, currentModel]);

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
    setSpeed(await config.playback.getSpeedOverride());
  }, [config]);

  useEffect(() => {
    config
      .getActiveModel()
      .then(setCurrentModel)
      .catch(() => undefined);
    config
      .getSettings()
      .then((settings) => setDefaultRate(config.rateSetting(settings) ?? "1"))
      .catch(() => undefined);
    refreshSelection(true).catch(() => undefined);
    refreshSpeed().catch(() => undefined);
    const player = playerRef.current;

    return () => {
      player.cleanup();
    };
  }, [config, refreshSelection, refreshSpeed]);

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
    async (voice: Voice) => {
      if (!selectedText.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text to read",
          message: "Refresh the selection or paste from the clipboard.",
        });
        return;
      }

      playerRef.current.stopPlayback();
      await config.playback.clearPlaybackStopRequest();
      const player = new AudioPlayer();
      playerRef.current = player;

      setIsLoading(true);
      setPlayingVoiceId(voice.id);

      try {
        const options = await config.buildOptions(voice.id);
        const modelLabel = config.getModelLabel(options.model);
        const chunks = config.chunkText(selectedText);
        const totalChunks = chunks.length;

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Synthesizing${totalChunks > 1 ? ` · ${totalChunks} chunks` : ""}`,
          message: `${voice.name} · ${modelLabel}`,
        });

        await config.playback.setNowPlaying({
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

        await config.playChunksWithLookahead(chunks, options, player, {
          onChunkReady: async (index, total) => {
            toast.title = total > 1 ? `Playing ${index + 1}/${total} · ${voice.name}` : `Playing · ${voice.name}`;
            toast.message = modelLabel;
            await config.playback.patchNowPlaying({ status: "playing", currentChunk: index });
          },
          onFirstAudioReady: async () => {
            setIsLoading(false);
          },
        });

        if (player.isStopped()) {
          toast.style = Toast.Style.Success;
          toast.title = "Stopped";
          await config.playback.markIdle();
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Playback complete";
          toast.message = `${voice.name} · ${totalChunks > 1 ? `${totalChunks} chunks` : "1 chunk"}`;
          await config.playback.markIdle();
        }
      } catch (error) {
        await config.playback.markError(error instanceof Error ? error.message : String(error));
        await config.showTTSFailure(error);
      } finally {
        setIsLoading(false);
        setPlayingVoiceId(null);
      }
    },
    [config, selectedText, selectionSource],
  );

  const handleStop = useCallback(async () => {
    playerRef.current.stopPlayback();
    await config.playback.requestPlaybackStop();
    setPlayingVoiceId(null);
    await config.playback.clearNowPlaying();
    await showToast({ style: Toast.Style.Success, title: "Playback stopped" });
  }, [config]);

  const handleSpeedUp = useCallback(async () => {
    await adjustSpeed(config.playback.speedStep);
  }, [config, defaultRate]);

  const handleSpeedDown = useCallback(async () => {
    await adjustSpeed(-config.playback.speedStep);
  }, [config, defaultRate]);

  const adjustSpeed = async (delta: number) => {
    const fallback = config.playback.parseRateString(defaultRate);
    const current = (await config.playback.getSpeedOverride()) ?? fallback;
    const next = await config.playback.setSpeedOverride(current + delta);
    setSpeed(next);
    await showToast({
      style: Toast.Style.Success,
      title: `Speed ${config.playback.formatSpeed(next)}`,
      message: "Applies to the next playback",
    });
  };

  const textPreview = selectedText
    ? selectedText.length > 90
      ? `${selectedText.substring(0, 90)}...`
      : selectedText
    : "No text loaded";

  const effectiveRate = speed ?? config.playback.parseRateString(defaultRate);
  const speedLabel = `${config.playback.formatSpeed(effectiveRate)}${speed === null ? " (default)" : " (override)"}`;
  const modelLabel = config.modelLabels[currentModel];
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
      searchBarPlaceholder={config.searchBarPlaceholder}
      onSearchTextChange={setSearchText}
      navigationTitle={config.navigationTitle}
    >
      <List.EmptyView
        icon={Icon.SpeakerOff}
        title="No voices found"
        description={config.emptyDescription(modelLabel)}
      />
      <List.Section title="Current Text">
        <List.Item
          title={textPreview}
          subtitle={
            selectedText
              ? `${selectedText.length} characters · ${formatSource(selectionSource)} · ${speedLabel}`
              : `${modelLabel} · ${speedLabel}`
          }
          icon={selectionSource === "clipboard" ? Icon.Clipboard : Icon.Text}
          detail={
            <SelectionDetail
              selectedText={selectedText}
              model={modelLabel}
              source={selectionSource}
              speedLabel={speedLabel}
            />
          }
          actions={
            <ActionPanel>
              <TextActions
                loadFromClipboard={loadFromClipboard}
                refreshSelection={refreshSelection}
                speedActions={speedActions}
                stopAction={stopAction}
              />
              <OpenProviderSetupAction provider={config.provider} />
              <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openProviderSettings} />
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
              keywords={config.getKeywords(voice)}
              accessories={[
                ...(playingVoiceId === voice.id ? [{ tag: { value: "Playing", color: Color.Blue } }] : []),
                ...(voice.recommended ? [{ tag: { value: "Recommended", color: Color.Green } }] : []),
              ]}
              detail={
                <VoiceDetail
                  voice={voice}
                  model={modelLabel}
                  selectedText={selectedText}
                  speedLabel={speedLabel}
                  providerLabel={config.providerLabel}
                  metadata={config.voiceMetadata ? config.voiceMetadata(voice) : []}
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
                  <OpenProviderSetupAction provider={config.provider} />
                  <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openProviderSettings} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function TextActions({
  loadFromClipboard,
  refreshSelection,
  speedActions,
  stopAction,
}: {
  loadFromClipboard: () => Promise<void>;
  refreshSelection: (silent?: boolean) => Promise<void>;
  speedActions: ReactElement;
  stopAction: ReactElement | null;
}) {
  return (
    <>
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
    </>
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
    : "## Select text on macOS, then press Command-R to refresh or paste from clipboard with Command-Shift-V.";

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

function VoiceDetail<Model extends string>({
  voice,
  model,
  selectedText,
  speedLabel,
  providerLabel,
  metadata,
}: {
  voice: ReadVoice<Model>;
  model: string;
  selectedText: string;
  speedLabel: string;
  providerLabel: string;
  metadata: Array<{ title: string; text: string }>;
}) {
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(voice.name)}\n\n${escapeMarkdown(voice.description)}\n\nChoose this voice to read the current text with ${providerLabel}.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Voice ID" text={voice.id} />
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          {metadata.map((item) => (
            <List.Item.Detail.Metadata.Label key={item.title} title={item.title} text={item.text} />
          ))}
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

function openProviderSettings() {
  return openExtensionPreferences();
}

function voiceIcon<Model extends string>(voice: ReadVoice<Model>) {
  if (voice.gender === "female") return Icon.Female;
  if (voice.gender === "male") return Icon.Male;
  return Icon.SpeakerHigh;
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
