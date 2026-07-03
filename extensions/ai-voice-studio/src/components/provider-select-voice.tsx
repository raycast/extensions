import { Action, ActionPanel, Color, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "../utils/audio-player";
import type { TTSProvider } from "../utils/provider";
import { OpenProviderSetupAction } from "./provider-setup-form";

interface SelectableVoice<Model extends string> {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  category: string;
  description: string;
  models: Model[];
  recommended?: boolean;
}

interface PreviewOptions {
  format: string;
  playbackRate: number;
}

interface SelectVoiceConfig<
  Model extends string,
  Voice extends SelectableVoice<Model>,
  Options extends PreviewOptions,
> {
  buildOptions: (voiceId: string) => Promise<Options>;
  categories: readonly string[];
  clearPlaybackStopRequest: () => Promise<void>;
  clearQuickReadVoiceOverride: () => Promise<void>;
  defaultModel: Model;
  fallbackPreviewText: string;
  getActiveModel: () => Promise<Model>;
  getActiveQuickReadVoiceId: () => Promise<{ voiceId: string; isOverride: boolean }>;
  getKeywords: (voice: Voice) => string[];
  getModelLabel: (model: Model) => string;
  getPreviewText: (fallbackText: string, charLimit: number) => Promise<string>;
  getVoiceById: (id: string) => Voice | undefined;
  getVoicesByCategory: (category: string, model?: Model) => Voice[];
  navigationTitle: string;
  provider: TTSProvider;
  searchBarPlaceholder: string;
  setQuickReadVoiceOverride: (voiceId: string) => Promise<void>;
  showTTSFailure: (error: unknown, title?: string) => Promise<void>;
  synthesizeSpeech: (text: string, options: Options, signal?: AbortSignal) => Promise<string>;
  voiceMetadata?: (voice: Voice) => Array<{ title: string; text: string }>;
}

const PREVIEW_CHAR_LIMIT = 180;

export function ProviderSelectVoice<
  Model extends string,
  Voice extends SelectableVoice<Model>,
  Options extends PreviewOptions,
>({ config }: { config: SelectVoiceConfig<Model, Voice, Options> }) {
  const [currentModel, setCurrentModel] = useState(config.defaultModel);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [usesOverride, setUsesOverride] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef(new AudioPlayer());

  const voiceGroups = useMemo(
    () =>
      config.categories
        .map((category) => ({
          category,
          voices: config.getVoicesByCategory(category, currentModel),
        }))
        .filter((group) => group.voices.length > 0),
    [config, currentModel],
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [activeVoice, model] = await Promise.all([config.getActiveQuickReadVoiceId(), config.getActiveModel()]);
        if (!mounted) return;
        setActiveVoiceId(activeVoice.voiceId);
        setUsesOverride(activeVoice.isOverride);
        setCurrentModel(model);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      playerRef.current.cleanup();
    };
  }, [config]);

  const handleSetVoice = useCallback(
    async (voice: Voice) => {
      await config.setQuickReadVoiceOverride(voice.id);
      setActiveVoiceId(voice.id);
      setUsesOverride(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Quick Read voice updated",
        message: voice.name,
      });
    },
    [config],
  );

  const handlePreviewVoice = useCallback(
    async (voice: Voice) => {
      playerRef.current.stopPlayback();
      await config.clearPlaybackStopRequest();
      const player = new AudioPlayer();
      playerRef.current = player;
      setPreviewingVoiceId(voice.id);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Synthesizing preview · ${voice.name}`,
      });

      try {
        const text = await config.getPreviewText(config.fallbackPreviewText, PREVIEW_CHAR_LIMIT);
        if (player.isStopped()) return;
        const options = await config.buildOptions(voice.id);
        const audio = await config.synthesizeSpeech(text, options, player.signal);
        if (player.isStopped()) return;
        toast.style = Toast.Style.Animated;
        toast.title = `Playing preview · ${voice.name}`;
        await player.playAudio(audio, options.format, options.playbackRate);
        if (!player.isStopped()) {
          toast.style = Toast.Style.Success;
          toast.title = `Preview complete · ${voice.name}`;
        }
      } catch (error) {
        if (player.isStopped()) return;
        await config.showTTSFailure(error, "Preview failed");
      } finally {
        if (playerRef.current === player) setPreviewingVoiceId(null);
      }
    },
    [config],
  );

  const handleResetVoice = useCallback(async () => {
    await config.clearQuickReadVoiceOverride();
    const activeVoice = await config.getActiveQuickReadVoiceId();
    setActiveVoiceId(activeVoice.voiceId);
    setUsesOverride(activeVoice.isOverride);
    await showToast({ style: Toast.Style.Success, title: "Using the configured default voice" });
  }, [config]);

  const currentVoice = activeVoiceId ? config.getVoiceById(activeVoiceId) : undefined;
  const modelLabel = config.getModelLabel(currentModel);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={config.searchBarPlaceholder}
      navigationTitle={config.navigationTitle}
    >
      <List.Section title="Current">
        <List.Item
          title={currentVoice?.name ?? activeVoiceId ?? "Configured Default"}
          subtitle={usesOverride ? "Custom Quick Read voice" : `Configured Default · ${modelLabel}`}
          icon={{ source: Icon.Star, tintColor: usesOverride ? Color.Yellow : Color.SecondaryText }}
          detail={<CurrentVoiceDetail voice={currentVoice} model={modelLabel} usesOverride={usesOverride} />}
          actions={
            <ActionPanel>
              {currentVoice ? (
                <Action
                  title="Preview Current Voice"
                  icon={Icon.Play}
                  onAction={() => handlePreviewVoice(currentVoice)}
                />
              ) : null}
              {usesOverride ? (
                <Action title="Reset to Default Voice" icon={Icon.RotateClockwise} onAction={handleResetVoice} />
              ) : null}
              <OpenProviderSetupAction provider={config.provider} />
              <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openProviderSettings} />
            </ActionPanel>
          }
        />
      </List.Section>

      {voiceGroups.map(({ category, voices }) => (
        <List.Section key={category} title={category}>
          {voices.map((voice) => (
            <List.Item
              key={voice.id}
              title={voice.name}
              subtitle={voice.description}
              icon={voiceIcon(voice)}
              keywords={config.getKeywords(voice)}
              accessories={[
                ...(activeVoiceId === voice.id ? [{ tag: { value: "Quick Read", color: Color.Green } }] : []),
                ...(previewingVoiceId === voice.id ? [{ tag: { value: "Previewing", color: Color.Blue } }] : []),
              ]}
              detail={
                <VoiceDetail
                  voice={voice}
                  model={modelLabel}
                  metadata={config.voiceMetadata ? config.voiceMetadata(voice) : []}
                />
              }
              actions={
                <ActionPanel>
                  <Action title="Set as Quick Read Voice" icon={Icon.Star} onAction={() => handleSetVoice(voice)} />
                  <Action title="Preview Voice" icon={Icon.Play} onAction={() => handlePreviewVoice(voice)} />
                  {usesOverride ? (
                    <Action title="Reset to Default Voice" icon={Icon.RotateClockwise} onAction={handleResetVoice} />
                  ) : null}
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

function openProviderSettings() {
  return openExtensionPreferences();
}

function CurrentVoiceDetail<Model extends string>({
  voice,
  model,
  usesOverride,
}: {
  voice: SelectableVoice<Model> | undefined;
  model: string;
  usesOverride: boolean;
}) {
  return (
    <List.Item.Detail
      markdown={
        voice
          ? `## ${escapeMarkdown(voice.name)}\n\n${escapeMarkdown(voice.description)}`
          : "## Configured Default\n\nQuick Read will use the default voice from Setup Voice Defaults."
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label
            title="Mode"
            text={usesOverride ? "Custom Quick Read voice" : "Configured Default"}
          />
          {voice ? <List.Item.Detail.Metadata.Label title="Voice ID" text={voice.id} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function VoiceDetail<Model extends string>({
  voice,
  model,
  metadata,
}: {
  voice: SelectableVoice<Model>;
  model: string;
  metadata: Array<{ title: string; text: string }>;
}) {
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(voice.name)}\n\n${escapeMarkdown(voice.description)}\n\nUse Preview to hear this voice with your selected text or clipboard content.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Voice ID" text={voice.id} />
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          {metadata.map((item) => (
            <List.Item.Detail.Metadata.Label key={item.title} title={item.title} text={item.text} />
          ))}
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

function voiceIcon<Model extends string>(voice: SelectableVoice<Model>) {
  if (voice.gender === "female") return Icon.Female;
  if (voice.gender === "male") return Icon.Male;
  return Icon.SpeakerHigh;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}
