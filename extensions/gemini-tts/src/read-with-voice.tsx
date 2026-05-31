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
import { useState, useEffect, useCallback, useRef } from "react";
import { FALLBACK_VOICES, groupVoicesByCategory, isAcademicRecommendedVoice } from "./constants/voices";
import {
  synthesizeSpeech,
  buildOptionsFromPrefs,
  isSynthesisCancelled,
  listVoices,
  resolveOptionsForText,
  TTSApiError,
} from "./api/gemini-tts";
import { chunkText } from "./utils/text-chunker";
import {
  AudioPlayer,
  clearExternalStopRequest,
  hasExternalStopRequest,
  stopExternalPlayback,
} from "./utils/audio-player";
import { getQuickReadVoiceOverride, setQuickReadVoiceOverride } from "./utils/voice-preferences";
import { buildTextPreview, clearPlaybackState, writePlaybackState } from "./utils/playback-state";
import { clampSpeed, clearPlaybackSpeed, readPlaybackSpeed, writePlaybackSpeed } from "./utils/playback-speed";
import { acquireSessionLock, releaseSessionLock, waitForSessionLockRelease } from "./utils/session-lock";
import type { SynthesisResult, TTSOptions, VoiceConfig } from "./api/types";

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
  const playerRef = useRef(new AudioPlayer());
  const synthesisAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const quickReadVoiceOverride = await getQuickReadVoiceOverride();
      const text = await getSelectedText().catch(() => "");
      try {
        const voiceList = await listVoices();
        if (!mounted) return;
        setSelectedText(text);
        setVoices(includeStoredVoice(voiceList.length > 0 ? voiceList : FALLBACK_VOICES, quickReadVoiceOverride));
      } catch (error) {
        if (!mounted) return;
        setSelectedText(text);
        setVoices(includeStoredVoice(FALLBACK_VOICES, quickReadVoiceOverride));
        showToast({
          style: Toast.Style.Failure,
          title: "Using built-in voice list",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();

    // Note: intentionally do NOT call playerRef.current.cleanup() on unmount.
    // We want playback to survive when the user dismisses the view, so they
    // can keep reading in the background. The PID-file machinery keeps Stop
    // Reading / menubar / Quick Read toggle in sync.
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

      // Stop any prior playback before kicking off a new one.
      synthesisAbortRef.current?.abort();
      playerRef.current.stopPlayback();
      // If we still hold a session lock from a prior read in this same
      // view, release it before stopExternalPlayback's hasActiveSession()
      // check runs — otherwise our own lock looks like an external holder
      // and waitForSessionLockRelease below would time out waiting for
      // us to release a lock we hold, surfacing as a "Stopping previous
      // reading" toast that never clears.
      releaseSessionLock();
      const stoppedExisting = stopExternalPlayback();
      if (stoppedExisting) {
        const released = await waitForSessionLockRelease();
        if (!released) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Stopping previous reading",
            message: "Try again in a moment if the previous Gemini request is still winding down.",
          });
          return;
        }
      }
      clearExternalStopRequest();
      // Acquire session lock so a Quick Read or Resume triggered while
      // this in-component reader is running can stop us cleanly. The
      // lock is held for the entire synth+play lifetime.
      if (!acquireSessionLock()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Another reading is already in progress",
          message: "Stop it first, or wait for it to finish.",
        });
        return;
      }
      const player = new AudioPlayer();
      playerRef.current = player;
      const synthesisController = new AbortController();
      synthesisAbortRef.current = synthesisController;
      const stopPoll = setInterval(() => {
        if ((player.isStopped() || hasExternalStopRequest()) && !synthesisController.signal.aborted) {
          synthesisController.abort();
        }
      }, 100);

      const chunks = chunkText(text);
      const total = chunks.length;
      const preview = buildTextPreview(text);

      setProgress({ voiceId: voice.id, phase: "synthesizing", chunkIndex: 0, chunkTotal: total });

      try {
        const options = resolveOptionsForText(buildOptionsFromPrefs(voice.id), text);
        let currentSpeed = clampSpeed(options.speed);
        await writePlaybackSpeed(currentSpeed);

        // Same producer/consumer pipeline as reading-runner: prefetch
        // chunk i+1 while playing chunk i so the user only ever waits
        // for the lead chunk.
        const startSynth = (chunkText: string): Promise<SynthesisResult> =>
          synthesizeSpeech(chunkText, options as TTSOptions, synthesisController.signal);

        let pending: Promise<SynthesisResult> | null = total > 0 ? startSynth(chunks[0]) : null;
        pending?.catch(() => undefined);

        for (let i = 0; i < total; i++) {
          if (player.isStopped() || hasExternalStopRequest()) break;

          // Pick up any speed change made by Speed Up / Slow Down between chunks.
          currentSpeed = (await readPlaybackSpeed()) ?? currentSpeed;

          setProgress({ voiceId: voice.id, phase: "synthesizing", chunkIndex: i, chunkTotal: total });
          await writePlaybackState({
            phase: "synthesizing",
            voiceId: voice.id,
            source: "selection",
            textPreview: preview,
            totalChars: text.length,
            chunkIndex: i,
            chunkTotal: total,
            speed: currentSpeed,
            updatedAt: new Date().toISOString(),
          });

          let audio: SynthesisResult;
          try {
            audio = await (pending ?? startSynth(chunks[i]));
          } finally {
            pending = null;
          }
          if (player.isStopped() || hasExternalStopRequest()) break;

          // Kick off the next chunk's synthesis in parallel with playback.
          if (i + 1 < total) {
            pending = startSynth(chunks[i + 1]);
            pending.catch(() => undefined);
          }

          setProgress({ voiceId: voice.id, phase: "playing", chunkIndex: i, chunkTotal: total });
          await writePlaybackState({
            phase: "playing",
            voiceId: voice.id,
            source: "selection",
            textPreview: preview,
            totalChars: text.length,
            chunkIndex: i,
            chunkTotal: total,
            speed: currentSpeed,
            updatedAt: new Date().toISOString(),
          });

          await player.playAudio(audio, currentSpeed);
        }

        if (pending) {
          pending.catch(() => undefined);
        }

        if (!player.isStopped() && !hasExternalStopRequest()) {
          await clearPlaybackState();
          await clearPlaybackSpeed();
          await showToast({ style: Toast.Style.Success, title: "Playback complete", message: voice.name });
        } else if (hasExternalStopRequest()) {
          await clearPlaybackState();
          await clearPlaybackSpeed();
          clearExternalStopRequest();
        }
      } catch (error) {
        await clearPlaybackState();
        await clearPlaybackSpeed();
        if (isSynthesisCancelled(error)) {
          clearExternalStopRequest();
          return;
        }
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
        synthesisController.abort();
        clearInterval(stopPoll);
        if (synthesisAbortRef.current === synthesisController) {
          synthesisAbortRef.current = null;
        }
        setProgress((current) => (current?.voiceId === voice.id ? null : current));
        releaseSessionLock();
        clearExternalStopRequest();
      }
    },
    [selectedText],
  );

  const handleStop = useCallback(async () => {
    synthesisAbortRef.current?.abort();
    playerRef.current.stopPlayback();
    stopExternalPlayback();
    setProgress(null);
    await clearPlaybackState();
    await clearPlaybackSpeed();
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
    <List isLoading={isLoading} searchBarPlaceholder="Search Gemini voices...">
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
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
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
                  ...(isAcademicRecommendedVoice(voice.id)
                    ? [{ tag: { value: "Academic Pick", color: Color.Blue } }]
                    : []),
                  ...(voice.isCustom ? [{ tag: { value: "Stored", color: Color.Orange } }] : []),
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
                    <Action.CopyToClipboard title="Copy Voice Id" content={voice.id} />
                    <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
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

function progressLabel(progress: RowProgress): string {
  const { chunkIndex, chunkTotal, phase } = progress;
  const verb = phase === "synthesizing" ? "Synthesizing" : "Playing";
  if (chunkTotal <= 1) return verb;
  return `${verb} ${chunkIndex + 1}/${chunkTotal}`;
}

function phaseColor(phase: RowPhase): Color {
  return phase === "synthesizing" ? Color.Orange : Color.Blue;
}

function includeStoredVoice(voices: VoiceConfig[], storedVoiceId: string | null): VoiceConfig[] {
  if (!storedVoiceId || voices.some((voice) => voice.id === storedVoiceId)) {
    return voices;
  }

  return [
    {
      id: storedVoiceId,
      name: storedVoiceId,
      category: "Stored",
      description: "Saved before the voice list changed",
      gender: "unknown",
      isCustom: true,
    },
    ...voices,
  ];
}
