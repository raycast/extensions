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
  isTokenPlanCompatibleModel,
  listVoices,
  TTSApiError,
} from "./api/minimax-tts";
import { addCustomVoices, collectCustomVoiceIds, FALLBACK_VOICES, groupVoicesByCategory } from "./constants/voices";
import type { VoiceConfig } from "./api/types";
import { AudioPlayer } from "./utils/audio-player";
import { getReadableText } from "./utils/text-source";
import {
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  setQuickReadVoiceOverride,
} from "./utils/voice-preferences";
import { readCachedVoices, writeCachedVoices } from "./utils/voice-cache";

const PREVIEW_FALLBACK_TEXT = "这是一段 MiniMax TTS 音色试听。";
const PREVIEW_CHAR_LIMIT = 180;

interface ConfigStatus {
  authLabel: string;
  modelLabel: string;
  regionLabel: string;
  warning?: string;
}

export default function SelectVoice() {
  const [voices, setVoices] = useState<VoiceConfig[]>(FALLBACK_VOICES);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [usesOverride, setUsesOverride] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef(new AudioPlayer());

  const configStatus = useMemo(() => buildConfigStatus(), []);
  const customDefaultVoiceId = useMemo(() => getPreferenceValues<Preferences>().customDefaultVoice?.trim() || null, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const prefs = getPreferenceValues<Preferences>();
      const cacheKey = { region: prefs.region || "cn", authMode: prefs.authMode || "auto" };
      const withCustomVoices = (voiceList: VoiceConfig[], extraVoiceId?: string) =>
        addCustomVoices(voiceList, collectCustomVoiceIds(prefs.customDefaultVoice, prefs.customVoiceIds, extraVoiceId));

      const cached = await readCachedVoices(cacheKey.region, cacheKey.authMode);
      if (mounted && cached) {
        setVoices(withCustomVoices(cached.voices));
        setIsLoading(!cached.isFresh);
      }

      const activeVoice = await getActiveQuickReadVoiceId();
      const activeVoiceIdForList = activeVoice.isOverride ? activeVoice.voiceId : undefined;
      if (mounted) {
        setActiveVoiceId(activeVoice.voiceId);
        setUsesOverride(activeVoice.isOverride);
        if (activeVoiceIdForList) {
          setVoices((current) => withCustomVoices(current, activeVoiceIdForList));
        }
      }

      try {
        const voiceList = await listVoices();
        if (!mounted) return;
        if (voiceList.length > 0) {
          setVoices(withCustomVoices(voiceList, activeVoiceIdForList));
          await writeCachedVoices(voiceList, cacheKey.region, cacheKey.authMode);
        } else if (!cached) {
          setVoices(withCustomVoices(FALLBACK_VOICES, activeVoiceIdForList));
        }
      } catch (error) {
        if (!mounted) return;
        if (!cached) {
          setVoices(withCustomVoices(FALLBACK_VOICES, activeVoiceIdForList));
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
    playerRef.current.stopPlayback();
    const player = new AudioPlayer();
    playerRef.current = player;
    setPreviewingVoiceId(voice.id);

    try {
      const readableText = await getReadableText();
      const previewText = getPreviewText(readableText?.text || PREVIEW_FALLBACK_TEXT);
      const audio = await synthesizeSpeech(previewText, buildOptionsFromPrefs(voice.id));
      if (player.isStopped()) return;
      await player.playAudio(audio);
    } catch (error) {
      if (error instanceof TTSApiError) {
        if (error.code === -1 || error.code === -6) {
          await showToast({
            style: Toast.Style.Failure,
            title: error.code === -1 ? "Configuration Required" : "Model Not Available",
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
      setPreviewingVoiceId((current) => (current === voice.id ? null : current));
    }
  }, []);

  const handleStopPreview = useCallback(() => {
    playerRef.current.stopPlayback();
    setPreviewingVoiceId(null);
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
          subtitle={`${configStatus.authLabel} · ${configStatus.modelLabel} · ${configStatus.regionLabel}`}
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
                ...(customDefaultVoiceId === voice.id
                  ? [{ tag: { value: "Default", color: Color.SecondaryText } }]
                  : []),
                ...(voice.isCustom ? [{ tag: { value: "Unverified", color: Color.Orange } }] : []),
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
  const tokenPlanKey = prefs.tokenPlanKey?.trim();
  const openPlatformApiKey = prefs.openPlatformApiKey?.trim();
  const model = prefs.model || "speech-2.8-hd";
  const authMode = prefs.authMode || "auto";

  const tokenPlanCompatible = isTokenPlanCompatibleModel(model);
  const regionLabel = prefs.region === "global" ? "Global" : "China";
  const modelLabel = model;

  let authLabel: string;
  let warning: string | undefined;

  if (authMode === "token-plan") {
    authLabel = "Token Plan";
    if (!tokenPlanKey) {
      warning = "Missing Token Plan Key";
    } else if (!tokenPlanCompatible) {
      warning = "Model not allowed on Token Plan";
    }
  } else if (authMode === "payg") {
    authLabel = "Open Platform";
    if (!openPlatformApiKey) {
      warning = "Missing Open Platform Key";
    }
  } else {
    if (!tokenPlanKey && !openPlatformApiKey) {
      authLabel = "Auto · no key configured";
      warning = "Add a key to get started";
    } else if (!tokenPlanCompatible && !openPlatformApiKey) {
      authLabel = "Auto · Token Plan only";
      warning = "Turbo models require an Open Platform Key";
    } else if (!tokenPlanCompatible && openPlatformApiKey) {
      authLabel = "Auto → Open Platform";
    } else if (tokenPlanKey) {
      authLabel = "Auto → Token Plan";
    } else {
      authLabel = "Auto → Open Platform";
    }
  }

  return { authLabel, modelLabel, regionLabel, warning };
}
