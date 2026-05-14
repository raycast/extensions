import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getSelectedText,
  Icon,
  Color,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { addCustomVoices, collectCustomVoiceIds, FALLBACK_VOICES, groupVoicesByCategory } from "./constants/voices";
import { buildOptionsFromPrefs, listVoices, TTSApiError } from "./api/minimax-tts";
import { chunkText } from "./utils/text-chunker";
import {
  clearExternalStopRequest,
  requestExternalStop,
  stopExternalPlayback,
  waitForExternalStopPropagation,
} from "./utils/audio-player";
import { getQuickReadVoiceOverride, setQuickReadVoiceOverride } from "./utils/voice-preferences";
import { readCachedVoices, writeCachedVoices } from "./utils/voice-cache";
import { clearPlaybackState, readPlaybackState } from "./utils/playback-state";
import { clearPlaybackSpeed } from "./utils/playback-speed";
import { getMiniMaxSettings } from "./utils/provider-settings";
import { OpenProviderSetupAction } from "./components/provider-setup-form";
import { openProviderSetupCommand } from "./utils/provider-setup-command";
import { hashText, saveReadingSession, type ReadingSession } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";
import type { VoiceConfig } from "./api/types";

type RowPhase = "synthesizing" | "playing";

interface RowProgress {
  voiceId: string;
  phase: RowPhase;
  chunkIndex: number;
  chunkTotal: number;
}

export default function ReadWithVoice() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [voices, setVoices] = useState<VoiceConfig[]>(FALLBACK_VOICES);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<RowProgress | null>(null);
  const [customDefaultVoiceId, setCustomDefaultVoiceId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const settings = await getMiniMaxSettings();
      if (mounted) setCustomDefaultVoiceId(settings.customDefaultVoice?.trim() || null);
      const cacheKey = { region: settings.region, authMode: settings.authMode };
      const quickReadVoiceOverride = await getQuickReadVoiceOverride();
      const customVoiceIds = collectCustomVoiceIds(
        settings.customDefaultVoice,
        settings.customVoiceIds,
        quickReadVoiceOverride,
      );
      const withCustomVoices = (voiceList: VoiceConfig[]) => addCustomVoices(voiceList, customVoiceIds);

      // Render cached voices immediately so the picker is instant on warm start.
      const cached = await readCachedVoices(cacheKey.region, cacheKey.authMode);
      if (mounted && cached) {
        setVoices(withCustomVoices(cached.voices));
        setIsLoading(!cached.isFresh);
      }

      const text = await getSelectedText().catch(() => "");
      if (mounted) setSelectedText(text);

      // Always refresh in the background so cloned voices show up promptly.
      try {
        const voiceList = await listVoices();
        if (!mounted) return;
        if (voiceList.length > 0) {
          setVoices(withCustomVoices(voiceList));
          await writeCachedVoices(voiceList, cacheKey.region, cacheKey.authMode);
        } else if (!cached) {
          setVoices(withCustomVoices(FALLBACK_VOICES));
        }
      } catch (error) {
        if (!mounted) return;
        if (!cached) {
          setVoices(withCustomVoices(FALLBACK_VOICES));
          showToast({
            style: Toast.Style.Failure,
            title: "Using built-in voice list",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();

    // Playback survives view dismissal. The shared runner, PID-file machinery,
    // and Stop Reading command keep background playback in sync.
    return () => {
      mounted = false;
    };
  }, []);

  const handleRead = useCallback(
    async (voice: VoiceConfig) => {
      const text = selectedText.trim();
      if (!text) {
        await showToast({ style: Toast.Style.Failure, title: "No text selected" });
        return;
      }

      requestExternalStop();
      stopExternalPlayback();
      await waitForExternalStopPropagation();
      clearExternalStopRequest();

      const chunks = chunkText(text);
      const total = chunks.length;

      setProgress({ voiceId: voice.id, phase: "synthesizing", chunkIndex: 0, chunkTotal: total });

      try {
        const options = await buildOptionsFromPrefs(voice.id);
        const session = await createVoiceReadingSession(text, chunks, options);
        await playReadingSession(session, false, {
          onChunkPhase: ({ phase, chunkIndex, chunkTotal }) => {
            setProgress({ voiceId: voice.id, phase, chunkIndex, chunkTotal });
          },
        });

        const liveState = await readPlaybackState();
        if (liveState?.phase === "stopped") {
          await showToast({ style: Toast.Style.Success, title: "Playback stopped", message: voice.name });
        } else {
          await showToast({ style: Toast.Style.Success, title: "Playback complete", message: voice.name });
        }
      } catch (error) {
        await clearPlaybackState();
        await clearPlaybackSpeed();
        if (error instanceof TTSApiError) {
          if (error.code === -1 || error.code === -6) {
            await showToast({
              style: Toast.Style.Failure,
              title: error.code === -1 ? "Configuration Required" : "Model Not Available",
              message: error.message,
              primaryAction: getConfigurationAction(error.message),
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
        setProgress((current) => (current?.voiceId === voice.id ? null : current));
      }
    },
    [selectedText],
  );

  const handleStop = useCallback(async () => {
    requestExternalStop();
    stopExternalPlayback();
    setProgress(null);
    await clearPlaybackState();
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
          accessories={progress ? [{ tag: { value: progressLabel(progress), color: phaseColor(progress.phase) } }] : []}
          actions={
            <ActionPanel>
              {progress && (
                <Action
                  title="Stop Playback"
                  icon={Icon.Stop}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  onAction={handleStop}
                />
              )}
              <OpenProviderSetupAction provider="minimax" />
              <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openProviderSettings} />
            </ActionPanel>
          }
        />
      </List.Section>

      {groupVoicesByCategory(voices).map(([category, categoryVoices]) => (
        <List.Section key={category} title={category}>
          {categoryVoices.map((voice) => {
            const rowProgress = progress?.voiceId === voice.id ? progress : null;
            return (
              <List.Item
                key={voice.id}
                title={voice.name}
                subtitle={voice.isCustom ? undefined : voice.id}
                icon={voice.gender === "female" ? Icon.Female : voice.gender === "male" ? Icon.Male : Icon.Person}
                accessories={[
                  ...(rowProgress
                    ? [{ tag: { value: progressLabel(rowProgress), color: phaseColor(rowProgress.phase) } }]
                    : []),
                  ...(customDefaultVoiceId === voice.id
                    ? [{ tag: { value: "Default", color: Color.SecondaryText } }]
                    : []),
                  ...(voice.isCustom ? [{ tag: { value: "Unverified", color: Color.Orange } }] : []),
                  ...(voice.description ? [{ text: voice.description }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action title="Read with This Voice" icon={Icon.Play} onAction={() => handleRead(voice)} />
                    <Action
                      title="Set as Quick Read Voice"
                      icon={Icon.Star}
                      onAction={() => handleSetQuickReadVoice(voice)}
                    />
                    {progress && (
                      <Action
                        title="Stop Playback"
                        icon={Icon.Stop}
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                        onAction={handleStop}
                      />
                    )}
                    <Action.CopyToClipboard title="Copy Voice ID" content={voice.id} />
                    <OpenProviderSetupAction provider="minimax" />
                    <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openProviderSettings} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function openProviderSettings() {
  return openExtensionPreferences();
}

function getConfigurationAction(message: string) {
  return isCredentialError(message)
    ? { title: "Open API Key Preferences", onAction: openExtensionPreferences }
    : { title: "Setup Voice Defaults", onAction: openProviderSetupCommand };
}

function isCredentialError(message: string): boolean {
  return /\b(api\s*)?key\b/i.test(message);
}

function progressLabel(progress: RowProgress): string {
  const { chunkIndex, chunkTotal, phase } = progress;
  const verb = phase === "synthesizing" ? "Synthesizing" : "Playing";
  if (chunkTotal <= 1) return verb;
  return `${verb} ${chunkIndex + 1}/${chunkTotal}`;
}

function phaseColor(phase: RowPhase): Color {
  return phase === "synthesizing" ? Color.Orange : Color.Blue;
}

async function createVoiceReadingSession(
  text: string,
  chunks: string[],
  options: VoiceReadingOptions,
): Promise<ReadingSession> {
  const now = new Date().toISOString();
  const session: ReadingSession = {
    textHash: hashText(text),
    text,
    source: "selection",
    chunks,
    nextChunkIndex: 0,
    options,
    createdAt: now,
    updatedAt: now,
  };
  await saveReadingSession(session);
  return session;
}

type VoiceReadingOptions = Awaited<ReturnType<typeof buildOptionsFromPrefs>>;
