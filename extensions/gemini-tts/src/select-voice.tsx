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
import {
  synthesizeSpeech,
  buildOptionsFromPrefs,
  isSynthesisCancelled,
  listVoices,
  resolveOptionsForText,
  TTSApiError,
} from "./api/gemini-tts";
import { FALLBACK_VOICES, groupVoicesByCategory, isAcademicRecommendedVoice } from "./constants/voices";
import type { VoiceConfig } from "./api/types";
import {
  AudioPlayer,
  clearExternalStopRequest,
  hasExternalStopRequest,
  stopExternalPlayback,
} from "./utils/audio-player";
import { getReadableText } from "./utils/text-source";
import {
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  setQuickReadVoiceOverride,
} from "./utils/voice-preferences";
import { buildTextPreview, clearPlaybackState, writePlaybackState } from "./utils/playback-state";
import { acquireSessionLock, releaseSessionLock, waitForSessionLockRelease } from "./utils/session-lock";

const PREVIEW_FALLBACK_TEXT = "这是一段 Gemini TTS 音色试听。";
const PREVIEW_CHAR_LIMIT = 180;

interface ConfigStatus {
  authLabel: string;
  modelLabel: string;
  experienceLabel: string;
  warning?: string;
}

export default function SelectVoice() {
  const [voices, setVoices] = useState<VoiceConfig[]>(FALLBACK_VOICES);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [usesOverride, setUsesOverride] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef(new AudioPlayer());
  const synthesisAbortRef = useRef<AbortController | null>(null);

  const configStatus = useMemo(() => buildConfigStatus(), []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const activeVoice = await getActiveQuickReadVoiceId();
      const activeVoiceIdForList = activeVoice.isOverride ? activeVoice.voiceId : undefined;
      if (mounted) {
        setActiveVoiceId(activeVoice.voiceId);
        setUsesOverride(activeVoice.isOverride);
      }

      try {
        const voiceList = await listVoices();
        if (!mounted) return;
        setVoices(includeStoredVoice(voiceList.length > 0 ? voiceList : FALLBACK_VOICES, activeVoiceIdForList || null));
      } catch (error) {
        if (!mounted) return;
        setVoices(includeStoredVoice(FALLBACK_VOICES, activeVoiceIdForList || null));
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

    // Note: do NOT call playerRef.current.cleanup() on unmount — preview keeps
    // playing if the user dismisses the view, mirroring system speech behavior.
    return () => {
      mounted = false;
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
    synthesisAbortRef.current?.abort();
    playerRef.current.stopPlayback();
    // Same fix as read-with-voice: release our own lock first so
    // stopExternalPlayback's hasActiveSession() check doesn't mistake
    // a prior preview's lock for an external holder and deadlock the
    // waitForSessionLockRelease below.
    releaseSessionLock();
    const stoppedExisting = stopExternalPlayback();
    if (stoppedExisting) {
      const released = await waitForSessionLockRelease();
      if (!released) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Stopping previous preview",
          message: "Try again in a moment if the previous Gemini request is still winding down.",
        });
        return;
      }
    }
    clearExternalStopRequest();
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
    setPreviewingVoiceId(voice.id);

    try {
      const readableText = await getReadableText();
      const previewText = getPreviewText(readableText?.text || PREVIEW_FALLBACK_TEXT);
      const options = resolveOptionsForText(buildOptionsFromPrefs(voice.id), previewText);

      // Make the preview show up in the menu bar and respond to Stop.
      // Preview is a single chunk, so chunkIndex/chunkTotal are 0/1.
      const previewSummary = buildTextPreview(previewText);
      await writePlaybackState({
        phase: "synthesizing",
        voiceId: voice.id,
        source: readableText ? readableText.source : "clipboard",
        textPreview: previewSummary,
        totalChars: previewText.length,
        chunkIndex: 0,
        chunkTotal: 1,
        speed: options.speed,
        updatedAt: new Date().toISOString(),
      });

      const audio = await synthesizeSpeech(previewText, options, synthesisController.signal);
      if (player.isStopped() || hasExternalStopRequest()) {
        await clearPlaybackState();
        return;
      }

      await writePlaybackState({
        phase: "playing",
        voiceId: voice.id,
        source: readableText ? readableText.source : "clipboard",
        textPreview: previewSummary,
        totalChars: previewText.length,
        chunkIndex: 0,
        chunkTotal: 1,
        speed: options.speed,
        updatedAt: new Date().toISOString(),
      });

      await player.playAudio(audio, options.speed);
      await clearPlaybackState();
    } catch (error) {
      await clearPlaybackState();
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
          await showToast({ style: Toast.Style.Failure, title: "Preview failed", message: error.message });
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Preview failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      synthesisController.abort();
      clearInterval(stopPoll);
      if (synthesisAbortRef.current === synthesisController) {
        synthesisAbortRef.current = null;
      }
      setPreviewingVoiceId((current) => (current === voice.id ? null : current));
      releaseSessionLock();
      clearExternalStopRequest();
    }
  }, []);

  const handleStopPreview = useCallback(async () => {
    synthesisAbortRef.current?.abort();
    playerRef.current.stopPlayback();
    stopExternalPlayback();
    setPreviewingVoiceId(null);
    await clearPlaybackState();
  }, []);

  const handleResetVoice = useCallback(async () => {
    await clearQuickReadVoiceOverride();
    const activeVoice = await getActiveQuickReadVoiceId();
    setActiveVoiceId(activeVoice.voiceId);
    setUsesOverride(activeVoice.isOverride);
    await showToast({ style: Toast.Style.Success, title: "Reset to default voice" });
  }, []);

  const activeVoice = activeVoiceId ? voices.find((voice) => voice.id === activeVoiceId) : undefined;
  const activeVoiceTitle = activeVoice?.name || activeVoiceId || "Preference default";
  const activeVoiceSubtitle = activeVoice?.id || activeVoiceId || undefined;

  return (
    <List
      isLoading={isLoading}
      selectedItemId={activeVoiceId || undefined}
      searchBarPlaceholder="Search and choose the Quick Read voice..."
      navigationTitle="Select Quick Read Voice"
    >
      <List.Section title="Current">
        <List.Item
          title={activeVoiceTitle}
          subtitle={activeVoiceSubtitle}
          icon={{ source: Icon.Star, tintColor: usesOverride ? Color.Yellow : Color.SecondaryText }}
          accessories={[{ tag: { value: usesOverride ? "Override" : "Default", color: Color.SecondaryText } }]}
          actions={
            <ActionPanel>
              {usesOverride && (
                <Action title="Reset to Preference Default" icon={Icon.RotateClockwise} onAction={handleResetVoice} />
              )}
              {previewingVoiceId && (
                <Action
                  title="Stop Preview"
                  icon={Icon.Stop}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  onAction={handleStopPreview}
                />
              )}
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Active Configuration"
          subtitle={`${configStatus.authLabel} · ${configStatus.modelLabel} · ${configStatus.experienceLabel}`}
          icon={{
            source: configStatus.warning ? Icon.ExclamationMark : Icon.Info,
            tintColor: configStatus.warning ? Color.Orange : Color.SecondaryText,
          }}
          accessories={
            configStatus.warning ? [{ tag: { value: configStatus.warning, color: Color.Orange } }] : undefined
          }
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
              id={voice.id}
              key={voice.id}
              title={voice.name}
              subtitle={voice.isCustom ? undefined : voice.id}
              icon={voice.gender === "female" ? Icon.Female : voice.gender === "male" ? Icon.Male : Icon.Person}
              accessories={[
                ...(activeVoiceId === voice.id ? [{ tag: { value: "Quick Read", color: Color.Green } }] : []),
                ...(isAcademicRecommendedVoice(voice.id)
                  ? [{ tag: { value: "Academic Pick", color: Color.Blue } }]
                  : []),
                ...(voice.isCustom ? [{ tag: { value: "Stored", color: Color.Orange } }] : []),
                ...(previewingVoiceId === voice.id ? [{ tag: { value: "Previewing", color: Color.Blue } }] : []),
                ...(voice.description ? [{ text: voice.description }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action title="Set as Quick Read Voice" icon={Icon.Star} onAction={() => handleSetVoice(voice)} />
                  <Action title="Preview Voice" icon={Icon.Play} onAction={() => handlePreviewVoice(voice)} />
                  {previewingVoiceId && (
                    <Action
                      title="Stop Preview"
                      icon={Icon.Stop}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                      onAction={handleStopPreview}
                    />
                  )}
                  {usesOverride && (
                    <Action
                      title="Reset to Preference Default"
                      icon={Icon.RotateClockwise}
                      onAction={handleResetVoice}
                    />
                  )}
                  <Action.CopyToClipboard title="Copy Voice Id" content={voice.id} />
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

function buildConfigStatus(): ConfigStatus {
  const prefs = getPreferenceValues<Preferences>();
  const apiKey = prefs.geminiApiKey?.trim();
  const model = prefs.model || "gemini-3.1-flash-tts-preview";
  const modelLabel = model;
  const experienceLabel = formatExperienceLabel(prefs.readingExperience);
  const languageLabel = formatLanguageLabel(prefs.languageMode);
  const authLabel = apiKey ? "Gemini API Key configured" : "No Gemini API Key";
  const warning = apiKey ? undefined : "Add a key to get started";

  return { authLabel, modelLabel, experienceLabel: `${experienceLabel} · ${languageLabel}`, warning };
}

function formatExperienceLabel(readingExperience: string | undefined): string {
  switch (readingExperience) {
    case "auto":
      return "Smart Auto";
    case "legal-text":
    case "legal-scholar":
      return "Legal Text Mode";
    case "mandarin-lecture":
      return "Mandarin Lecture";
    case "english-paper":
      return "English Paper";
    case "news-briefing":
      return "News Briefing";
    case "audiobook":
      return "Audiobook";
    case "neutral":
      return "Neutral";
    default:
      return "Bilingual Academic";
  }
}

function formatLanguageLabel(languageMode: string | undefined): string {
  switch (languageMode) {
    case "cmn":
      return "Mandarin";
    case "en":
      return "English";
    case "auto":
      return "Auto Language";
    default:
      return "Mixed CN/EN";
  }
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
