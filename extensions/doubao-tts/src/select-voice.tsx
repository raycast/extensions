import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBaseModel, synthesizeSpeech, buildOptionsFromPrefs, TTSApiError } from "./api/volcengine-tts";
import type { VoiceConfig } from "./api/types";
import { VOICE_CATEGORIES, getVoiceById, getVoicesByCategory } from "./constants/voices";
import { AudioPlayer } from "./utils/audio-player";
import { getPreviewText } from "./utils/text-source";
import {
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  setQuickReadVoiceOverride,
} from "./utils/voice-preferences";

const PREVIEW_FALLBACK_TEXT = "这是一段豆包 TTS 音色试听。";
const PREVIEW_CHAR_LIMIT = 180;

export default function SelectVoice() {
  const prefs = getPreferenceValues<Preferences>();
  const currentModel = getBaseModel(prefs.resourceId || "seed-tts-2.0");
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [usesOverride, setUsesOverride] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef(new AudioPlayer());

  const voiceGroups = useMemo(
    () =>
      VOICE_CATEGORIES.map((category) => ({
        category,
        voices: getVoicesByCategory(category).filter((voice) => voice.model === currentModel),
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
      const audio = await synthesizeSpeech(text, buildOptionsFromPrefs(voice.id), player.signal);
      if (player.isStopped()) return;
      await player.playAudio(audio);
    } catch (error) {
      if (player.isStopped()) return;
      if (error instanceof TTSApiError) {
        await showToast({ style: Toast.Style.Failure, title: "Preview failed", message: error.message });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Preview failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search and choose the Quick Read voice..."
      navigationTitle="Select Quick Read Voice"
    >
      <List.Section title="Current">
        <List.Item
          title={activeVoiceId ? (getVoiceById(activeVoiceId)?.name ?? activeVoiceId) : "Preference default"}
          subtitle={usesOverride ? "Quick Read override" : `Preference default for ${currentModel}`}
          icon={{ source: Icon.Star, tintColor: usesOverride ? Color.Yellow : Color.SecondaryText }}
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
              subtitle={voice.id}
              icon={voice.gender === "female" ? Icon.Female : voice.gender === "male" ? Icon.Male : Icon.Person}
              accessories={[
                ...(activeVoiceId === voice.id ? [{ tag: { value: "Quick Read", color: Color.Green } }] : []),
                ...(previewingVoiceId === voice.id ? [{ tag: { value: "Previewing", color: Color.Blue } }] : []),
              ]}
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
