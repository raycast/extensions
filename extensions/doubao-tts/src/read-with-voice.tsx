import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getSelectedText,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { VOICE_CATEGORIES, getVoicesByCategory } from "./constants/voices";
import { synthesizeSpeech, buildOptionsFromPrefs, getBaseModel, TTSApiError } from "./api/volcengine-tts";
import { chunkText } from "./utils/text-chunker";
import { AudioPlayer } from "./utils/audio-player";
import type { VoiceConfig } from "./api/types";

export default function ReadWithVoice() {
  const prefs = getPreferenceValues<Preferences>();
  const currentModel = getBaseModel(prefs.resourceId || "seed-tts-2.0");
  const [selectedText, setSelectedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const playerRef = useRef(new AudioPlayer());

  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) {
      return VOICE_CATEGORIES.map((category) => ({
        category,
        voices: getVoicesByCategory(category).filter((v) => v.model === currentModel),
      })).filter((item) => item.voices.length > 0);
    }

    const searchLower = searchText.toLowerCase();
    return VOICE_CATEGORIES.map((category) => ({
      category,
      voices: getVoicesByCategory(category).filter(
        (v) =>
          v.model === currentModel &&
          (v.name.toLowerCase().includes(searchLower) || v.id.toLowerCase().includes(searchLower)),
      ),
    })).filter((item) => item.voices.length > 0);
  }, [searchText, currentModel]);

  useEffect(() => {
    getSelectedText()
      .then((text) => setSelectedText(text))
      .catch(() => {
        showToast({
          style: Toast.Style.Failure,
          title: "No text selected",
          message: "Please select text and try again",
        });
      });

    return () => {
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

  const textPreview = selectedText
    ? selectedText.length > 80
      ? selectedText.substring(0, 80) + "..."
      : selectedText
    : "No text selected";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search voices..." onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.SpeakerOff} title="No voices found" description="Try a different search term" />
      <List.Section title="Selected Text">
        <List.Item
          title={textPreview}
          subtitle={selectedText ? `${selectedText.length} chars` : undefined}
          icon={Icon.Text}
        />
      </List.Section>

      {filteredCategories.map(({ category, voices }) => (
        <List.Section key={category} title={category}>
          {voices.map((voice) => (
            <List.Item
              key={voice.id}
              title={voice.name}
              subtitle={voice.id}
              icon={voice.gender === "female" ? Icon.Female : voice.gender === "male" ? Icon.Male : Icon.Person}
              accessories={[...(playingVoiceId === voice.id ? [{ tag: { value: "Playing", color: "#3B82F6" } }] : [])]}
              actions={
                <ActionPanel>
                  <Action title="Read with This Voice" icon={Icon.Play} onAction={() => handleRead(voice)} />
                  {playingVoiceId && (
                    <Action
                      title="Stop Playback"
                      icon={Icon.Stop}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                      onAction={handleStop}
                    />
                  )}
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
