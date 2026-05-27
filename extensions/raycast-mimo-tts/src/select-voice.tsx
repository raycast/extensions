import { Action, ActionPanel, Color, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildOptionsAsync, getActiveModelAsync, getModelLabel, synthesizeSpeech } from "./api/mimo-tts";
import type { VoiceConfig } from "./api/mimo-types";
import {
  DEFAULT_MODEL,
  MODEL_LABELS,
  VOICE_CATEGORIES,
  getVoiceById,
  getVoicesByCategory,
} from "./constants/mimo-voices";
import { AudioPlayer } from "./utils/audio-player";
import { showTTSFailure } from "./utils/mimo-feedback";
import { getPreviewText } from "./utils/mimo-text-source";
import { clearPlaybackStopRequest } from "./utils/mimo-playback-state";
import {
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  setQuickReadVoiceOverride,
} from "./utils/mimo-voice-preferences";
import { OpenProviderSetupAction } from "./components/provider-setup-form";

const PREVIEW_FALLBACK_TEXT = "This is a short MiMo TTS voice preview.";
const PREVIEW_CHAR_LIMIT = 180;

export default function SelectVoice() {
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [usesOverride, setUsesOverride] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef(new AudioPlayer());

  const voiceGroups = useMemo(
    () =>
      VOICE_CATEGORIES.map((category) => ({
        category,
        voices: getVoicesByCategory(category, currentModel),
      })).filter((group) => group.voices.length > 0),
    [currentModel],
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [activeVoice, model] = await Promise.all([getActiveQuickReadVoiceId(), getActiveModelAsync()]);
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
  }, []);

  const handleSetVoice = useCallback(async (voice: VoiceConfig) => {
    await setQuickReadVoiceOverride(voice.id);
    setActiveVoiceId(voice.id);
    setUsesOverride(true);
    await showToast({
      style: Toast.Style.Success,
      title: "Quick Read voice updated",
      message: voice.name,
    });
  }, []);

  const handlePreviewVoice = useCallback(async (voice: VoiceConfig) => {
    playerRef.current.stopPlayback();
    await clearPlaybackStopRequest();
    const player = new AudioPlayer();
    playerRef.current = player;
    setPreviewingVoiceId(voice.id);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Synthesizing preview · ${voice.name}`,
    });

    try {
      const text = await getPreviewText(PREVIEW_FALLBACK_TEXT, PREVIEW_CHAR_LIMIT);
      if (player.isStopped()) return;
      const options = await buildOptionsAsync(voice.id);
      const audio = await synthesizeSpeech(text, options, player.signal);
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
      await showTTSFailure(error, "Preview failed");
    } finally {
      if (playerRef.current === player) setPreviewingVoiceId(null);
    }
  }, []);

  const handleResetVoice = useCallback(async () => {
    await clearQuickReadVoiceOverride();
    const activeVoice = await getActiveQuickReadVoiceId();
    setActiveVoiceId(activeVoice.voiceId);
    setUsesOverride(activeVoice.isOverride);
    await showToast({ style: Toast.Style.Success, title: "Using the configured default voice" });
  }, []);

  const currentVoice = activeVoiceId ? getVoiceById(activeVoiceId) : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search MiMo voices..."
      navigationTitle="Set Quick Read Voice"
    >
      <List.Section title="Current">
        <List.Item
          title={currentVoice?.name ?? activeVoiceId ?? "Configured Default"}
          subtitle={usesOverride ? "Custom Quick Read voice" : `Configured Default · ${getModelLabel(currentModel)}`}
          icon={{ source: Icon.Star, tintColor: usesOverride ? Color.Yellow : Color.SecondaryText }}
          detail={
            <CurrentVoiceDetail voice={currentVoice} model={MODEL_LABELS[currentModel]} usesOverride={usesOverride} />
          }
          actions={
            <ActionPanel>
              {currentVoice && (
                <Action
                  title="Preview Current Voice"
                  icon={Icon.Play}
                  onAction={() => handlePreviewVoice(currentVoice)}
                />
              )}
              {usesOverride && (
                <Action title="Reset to Default Voice" icon={Icon.RotateClockwise} onAction={handleResetVoice} />
              )}
              <OpenProviderSetupAction provider="mimo" />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
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
              keywords={[voice.id, voice.language, voice.category]}
              accessories={[
                ...(activeVoiceId === voice.id ? [{ tag: { value: "Quick Read", color: Color.Green } }] : []),
                ...(previewingVoiceId === voice.id ? [{ tag: { value: "Previewing", color: Color.Blue } }] : []),
              ]}
              detail={<VoiceDetail voice={voice} model={MODEL_LABELS[currentModel]} />}
              actions={
                <ActionPanel>
                  <Action title="Set as Quick Read Voice" icon={Icon.Star} onAction={() => handleSetVoice(voice)} />
                  <Action title="Preview Voice" icon={Icon.Play} onAction={() => handlePreviewVoice(voice)} />
                  {usesOverride && (
                    <Action title="Reset to Default Voice" icon={Icon.RotateClockwise} onAction={handleResetVoice} />
                  )}
                  <Action.CopyToClipboard title="Copy Voice Identifier" content={voice.id} />
                  <OpenProviderSetupAction provider="mimo" />
                  {/* eslint-disable-next-line @raycast/prefer-title-case */}
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

function CurrentVoiceDetail({
  voice,
  model,
  usesOverride,
}: {
  voice: VoiceConfig | undefined;
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

function VoiceDetail({ voice, model }: { voice: VoiceConfig; model: string }) {
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(voice.name)}\n\n${escapeMarkdown(voice.description)}\n\nUse Preview to hear this voice with your selected text or clipboard content.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Voice ID" text={voice.id} />
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label title="Language" text={voice.language} />
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
