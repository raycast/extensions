import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getSelectedText,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { FALLBACK_VOICES, groupVoicesByCategory } from "./constants/voices";
import { synthesizeSpeech, buildOptionsFromPrefs, listVoices, TTSApiError } from "./api/minimax-tts";
import { chunkText } from "./utils/text-chunker";
import { AudioPlayer } from "./utils/audio-player";
import { setQuickReadVoiceOverride } from "./utils/voice-preferences";
import type { VoiceConfig } from "./api/types";

export default function ReadWithVoice() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [voices, setVoices] = useState<VoiceConfig[]>(FALLBACK_VOICES);
  const [isLoading, setIsLoading] = useState(true);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const playerRef = useRef(new AudioPlayer());

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [text, voiceList] = await Promise.all([
          getSelectedText().catch(() => ""),
          listVoices().catch((error) => {
            showToast({
              style: Toast.Style.Failure,
              title: "Using built-in voice list",
              message: error instanceof Error ? error.message : String(error),
            });
            return FALLBACK_VOICES;
          }),
        ]);

        if (!mounted) return;
        setSelectedText(text);
        setVoices(voiceList.length > 0 ? voiceList : FALLBACK_VOICES);
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

  const handleRead = useCallback(
    async (voice: VoiceConfig) => {
      if (!selectedText.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "No text selected" });
        return;
      }

      playerRef.current.stopPlayback();
      const player = new AudioPlayer();
      playerRef.current = player;

      setIsLoading(true);
      setPlayingVoiceId(voice.id);

      try {
        const options = buildOptionsFromPrefs(voice.id);
        const chunks = chunkText(selectedText);

        await showToast({
          style: Toast.Style.Animated,
          title: `Synthesizing (${chunks.length} chunks)...`,
          message: voice.name,
        });

        for (let i = 0; i < chunks.length; i++) {
          if (player.isStopped()) break;
          const audio = await synthesizeSpeech(chunks[i], options);
          if (player.isStopped()) break;

          if (i === 0) {
            setIsLoading(false);
            await showToast({ style: Toast.Style.Animated, title: "Playing...", message: voice.name });
          }

          await player.playAudio(audio);
        }

        if (!player.isStopped()) {
          await showToast({ style: Toast.Style.Success, title: "Playback complete" });
        }
      } catch (error) {
        if (error instanceof TTSApiError) {
          if (error.code === -1) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Configuration Required",
              message: error.message,
              primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
            });
          } else {
            await showToast({ style: Toast.Style.Failure, title: "TTS Error", message: error.message });
          }
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        setIsLoading(false);
        setPlayingVoiceId(null);
      }
    },
    [selectedText],
  );

  const handleStop = useCallback(() => {
    playerRef.current.stopPlayback();
    setPlayingVoiceId(null);
    showToast({ style: Toast.Style.Success, title: "Playback stopped" });
  }, []);

  const handleSetQuickReadVoice = useCallback(async (voice: VoiceConfig) => {
    await setQuickReadVoiceOverride(voice.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Quick Read voice updated",
      message: voice.name,
    });
  }, []);

  const textPreview = selectedText
    ? selectedText.length > 80
      ? selectedText.substring(0, 80) + "..."
      : selectedText
    : "No text selected";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search MiniMax voices...">
      <List.Section title="Selected Text">
        <List.Item
          title={textPreview}
          subtitle={selectedText ? `${selectedText.length} chars` : undefined}
          icon={Icon.Text}
          actions={
            <ActionPanel>
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
                ...(playingVoiceId === voice.id ? [{ tag: { value: "Playing", color: "#3B82F6" } }] : []),
                ...(voice.description ? [{ text: voice.description }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action title="Read with This Voice" icon={Icon.Play} onAction={() => handleRead(voice)} />
                  <Action
                    title="Use as Quick Read Voice"
                    icon={Icon.Star}
                    onAction={() => handleSetQuickReadVoice(voice)}
                  />
                  {playingVoiceId && (
                    <Action
                      title="Stop Playback"
                      icon={Icon.Stop}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                      onAction={handleStop}
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
