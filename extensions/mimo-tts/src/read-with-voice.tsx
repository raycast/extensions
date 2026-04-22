import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getSelectedText,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildOptionsFromPrefs, getActiveModel, getModelLabel, TTSApiError } from "./api/mimo-tts";
import type { VoiceConfig } from "./api/types";
import { MODEL_LABELS, VOICE_CATEGORIES, getVoicesByCategory } from "./constants/voices";
import { AudioPlayer } from "./utils/audio-player";
import { chunkText } from "./utils/text-chunker";
import { playChunksWithLookahead } from "./utils/pipelined-reading";

export default function ReadWithVoice() {
  const currentModel = getActiveModel();
  const [selectedText, setSelectedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
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

  useEffect(() => {
    getSelectedText()
      .then((text) => setSelectedText(text))
      .catch(() => {
        showToast({
          style: Toast.Style.Failure,
          title: "No text selected",
          message: "Select text first, or use Quick Read from a text selection.",
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
          title: `Synthesizing ${chunks.length} chunk${chunks.length > 1 ? "s" : ""}`,
          message: `${voice.name} · ${getModelLabel(options.model)}`,
        });

        await playChunksWithLookahead(chunks, options, player, {
          onChunkReady: async (index, total) => {
            if (total > 1) {
              await showToast({
                style: Toast.Style.Animated,
                title: `Playing chunk ${index + 1} of ${total}`,
                message: voice.name,
              });
            }
          },
          onFirstAudioReady: async () => {
            setIsLoading(false);
            await showToast({ style: Toast.Style.Animated, title: "Playing", message: voice.name });
          },
        });

        if (!player.isStopped()) {
          await showToast({ style: Toast.Style.Success, title: "Playback complete" });
        }
      } catch (error) {
        await showPlaybackError(error);
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
    ? selectedText.length > 90
      ? `${selectedText.substring(0, 90)}...`
      : selectedText
    : "No text selected";

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
              ? `${selectedText.length} characters · ${MODEL_LABELS[currentModel]}`
              : MODEL_LABELS[currentModel]
          }
          icon={Icon.Text}
          detail={<SelectionDetail selectedText={selectedText} model={MODEL_LABELS[currentModel]} />}
          actions={
            <ActionPanel>
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
              detail={<VoiceDetail voice={voice} model={MODEL_LABELS[currentModel]} selectedText={selectedText} />}
              actions={
                <ActionPanel>
                  <Action title="Read Selected Text" icon={Icon.Play} onAction={() => handleRead(voice)} />
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

function SelectionDetail({ selectedText, model }: { selectedText: string; model: string }) {
  const text = selectedText.trim();
  const markdown = text
    ? `## Selected Text\n\n${escapeMarkdown(text.length > 1000 ? `${text.slice(0, 1000)}...` : text)}`
    : "## Select text anywhere on macOS, then run this command.";

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label title="Length" text={text ? `${text.length} characters` : "None"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function VoiceDetail({ voice, model, selectedText }: { voice: VoiceConfig; model: string; selectedText: string }) {
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(voice.name)}\n\n${escapeMarkdown(voice.description)}\n\nSelect this voice to read the current text with MiMo TTS.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Voice ID" text={voice.id} />
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label title="Language" text={voice.language} />
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

async function showPlaybackError(error: unknown): Promise<void> {
  if (error instanceof TTSApiError) {
    if (error.code === -1 || error.code === 401 || error.code === 403) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Configuration Required",
        message: error.message,
        primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
      });
      return;
    }
    await showToast({ style: Toast.Style.Failure, title: "MiMo TTS Error", message: error.message });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: error instanceof Error ? error.message : String(error),
  });
}
