import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeSpeech, buildOptionsFromPrefs, listVoices, TTSApiError } from "./api/minimax-tts";
import { FALLBACK_VOICES, groupVoicesByCategory } from "./constants/voices";
import type { VoiceConfig } from "./api/types";
import { AudioPlayer } from "./utils/audio-player";
import { getReadableText } from "./utils/text-source";
import {
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  setQuickReadVoiceOverride,
} from "./utils/voice-preferences";

const PREVIEW_FALLBACK_TEXT = "这是一段 MiniMax TTS 音色试听。";
const PREVIEW_CHAR_LIMIT = 180;

export default function SelectVoice() {
  const [voices, setVoices] = useState<VoiceConfig[]>(FALLBACK_VOICES);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [usesOverride, setUsesOverride] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef(new AudioPlayer());

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [voiceList, activeVoice] = await Promise.all([
          listVoices().catch((error) => {
            showToast({
              style: Toast.Style.Failure,
              title: "Using built-in voice list",
              message: error instanceof Error ? error.message : String(error),
            });
            return FALLBACK_VOICES;
          }),
          getActiveQuickReadVoiceId(),
        ]);

        if (!mounted) return;
        setVoices(voiceList.length > 0 ? voiceList : FALLBACK_VOICES);
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
      const readableText = await getReadableText();
      const previewText = getPreviewText(readableText?.text || PREVIEW_FALLBACK_TEXT);
      const audio = await synthesizeSpeech(previewText, buildOptionsFromPrefs(voice.id));
      await player.playAudio(audio);
    } catch (error) {
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
      setPreviewingVoiceId(null);
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
          title={activeVoiceId || "Preference default"}
          subtitle={usesOverride ? "Quick Read override" : "Preference default"}
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

      {groupVoicesByCategory(voices).map(([category, categoryVoices]) => (
        <List.Section key={category} title={category}>
          {categoryVoices.map((voice) => (
            <List.Item
              key={voice.id}
              title={voice.name}
              subtitle={voice.id}
              icon={voice.gender === "female" ? Icon.Female : voice.gender === "male" ? Icon.Male : Icon.Person}
              accessories={[
                ...(activeVoiceId === voice.id ? [{ tag: { value: "Quick Read", color: Color.Green } }] : []),
                ...(previewingVoiceId === voice.id ? [{ tag: { value: "Previewing", color: Color.Blue } }] : []),
                ...(voice.description ? [{ text: voice.description }] : []),
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

function getPreviewText(text: string): string {
  return Array.from(text.trim()).slice(0, PREVIEW_CHAR_LIMIT).join("") || PREVIEW_FALLBACK_TEXT;
}
