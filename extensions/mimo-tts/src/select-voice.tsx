import { Action, ActionPanel, Color, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildOptionsFromPrefs, getActiveModel, getModelLabel, synthesizeSpeech, TTSApiError } from "./api/mimo-tts";
import type { VoiceConfig } from "./api/types";
import { MODEL_LABELS, VOICE_CATEGORIES, getVoiceById, getVoicesByCategory } from "./constants/voices";
import { AudioPlayer } from "./utils/audio-player";
import { getPreviewText } from "./utils/text-source";
import {
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  setQuickReadVoiceOverride,
} from "./utils/voice-preferences";

const PREVIEW_FALLBACK_TEXT = "这是一段 MiMo TTS 音色试听。";
const PREVIEW_CHAR_LIMIT = 180;

export default function SelectVoice() {
  const currentModel = getActiveModel();
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
        const activeVoice = await getActiveQuickReadVoiceId();
        if (!mounted) return;
        setActiveVoiceId(activeVoice.voiceId);
        setUsesOverride(activeVoice.isOverride);
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
    const player = new AudioPlayer();
    playerRef.current = player;
    setPreviewingVoiceId(voice.id);

    try {
      const text = await getPreviewText(PREVIEW_FALLBACK_TEXT, PREVIEW_CHAR_LIMIT);
      if (player.isStopped()) return;
      const options = buildOptionsFromPrefs(voice.id);
      const audio = await synthesizeSpeech(text, options, player.signal);
      if (player.isStopped()) return;
      await player.playAudio(audio, options.format);
    } catch (error) {
      if (player.isStopped()) return;
      await showPreviewError(error);
    } finally {
      if (playerRef.current === player) setPreviewingVoiceId(null);
    }
  }, []);

  const handleResetVoice = useCallback(async () => {
    await clearQuickReadVoiceOverride();
    const activeVoice = await getActiveQuickReadVoiceId();
    setActiveVoiceId(activeVoice.voiceId);
    setUsesOverride(activeVoice.isOverride);
    await showToast({ style: Toast.Style.Success, title: "Using preference default voice" });
  }, []);

  const currentVoice = activeVoiceId ? getVoiceById(activeVoiceId) : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search MiMo voices..."
      navigationTitle="Select Quick Read Voice"
    >
      <List.Section title="Current">
        <List.Item
          title={currentVoice?.name ?? activeVoiceId ?? "Preference default"}
          subtitle={usesOverride ? "Quick Read override" : `Preference default · ${getModelLabel(currentModel)}`}
          icon={{ source: Icon.Star, tintColor: usesOverride ? Color.Yellow : Color.SecondaryText }}
          detail={
            <CurrentVoiceDetail voice={currentVoice} model={MODEL_LABELS[currentModel]} usesOverride={usesOverride} />
          }
          actions={
            <ActionPanel>
              {usesOverride && (
                <Action title="Reset to Preference Default" icon={Icon.RotateClockwise} onAction={handleResetVoice} />
              )}
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
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
                    <Action
                      title="Reset to Preference Default"
                      icon={Icon.RotateClockwise}
                      onAction={handleResetVoice}
                    />
                  )}
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
          : "## Preference default\n\nQuick Read will use the default voice configured in extension preferences."
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label
            title="Mode"
            text={usesOverride ? "Quick Read override" : "Preference default"}
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
      markdown={`## ${escapeMarkdown(voice.name)}\n\n${escapeMarkdown(voice.description)}\n\nUse preview to hear this voice with your selected text or clipboard text.`}
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

async function showPreviewError(error: unknown): Promise<void> {
  if (error instanceof TTSApiError) {
    await showToast({
      style: Toast.Style.Failure,
      title:
        error.code === -1 || error.code === 401 || error.code === 403 ? "Configuration Required" : "Preview failed",
      message: error.message,
      primaryAction:
        error.code === -1 || error.code === 401 || error.code === 403
          ? { title: "Open Preferences", onAction: () => openExtensionPreferences() }
          : undefined,
    });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Preview failed",
    message: error instanceof Error ? error.message : String(error),
  });
}
