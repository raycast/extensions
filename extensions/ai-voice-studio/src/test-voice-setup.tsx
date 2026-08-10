import { Icon, LaunchType, Toast, launchCommand, openExtensionPreferences, showHUD, showToast } from "@raycast/api";
import { synthesizeSpeech as synthesizeQwen, getModelLabel as getQwenModelLabel } from "./api/qwen-tts";
import { synthesizeSpeech as synthesizeMimo, getModelLabel as getMimoModelLabel } from "./api/mimo-tts";
import { synthesizeSpeech as synthesizeOpenAI, getModelLabel as getOpenAIModelLabel } from "./api/openai-tts";
import { getVoiceById as getQwenVoiceById } from "./constants/qwen-tts-voices";
import { getVoiceById as getMimoVoiceById } from "./constants/mimo-voices";
import { getVoiceById as getOpenAIVoiceById } from "./constants/openai-voices";
import { AudioPlayer, stopExternalPlayback, waitForExternalStopPropagation } from "./utils/audio-player";
import { getDefaultProvider, type TTSProvider } from "./utils/provider";
import { buildDefaultOptionsFromPrefs as buildQwenOptions } from "./utils/qwen-voice-preferences";
import { buildDefaultOptionsFromPrefs as buildMimoOptions } from "./utils/mimo-voice-preferences";
import { buildDefaultOptionsFromPrefs as buildOpenAIOptions } from "./utils/openai-voice-preferences";
import {
  clearNowPlaying as clearMimoNowPlaying,
  requestPlaybackStop as requestMimoPlaybackStop,
} from "./utils/mimo-playback-state";
import {
  clearNowPlaying as clearQwenNowPlaying,
  requestPlaybackStop as requestQwenPlaybackStop,
} from "./utils/qwen-playback-state";
import {
  clearNowPlaying as clearOpenAINowPlaying,
  requestPlaybackStop as requestOpenAIPlaybackStop,
} from "./utils/openai-playback-state";

const TEST_TEXT = "AI Voice Studio test. If you can hear this, the current voice setup is working.";
const SLOW_SYNTH_WARNING_MS = 10_000;
const SLOW_TOTAL_WARNING_MS = 15_000;

interface VoiceSetupResult {
  provider: TTSProvider;
  providerLabel: string;
  modelLabel: string;
  voiceLabel: string;
  audio: string;
  format: string;
  playbackRate: number;
  synthMs: number;
  bytes: number;
}

export default async function Command() {
  await Promise.all([requestQwenPlaybackStop(), requestMimoPlaybackStop(), requestOpenAIPlaybackStop()]);
  stopExternalPlayback();
  await waitForExternalStopPropagation();
  await Promise.all([clearQwenNowPlaying(), clearMimoNowPlaying(), clearOpenAINowPlaying()]);

  const provider = await getDefaultProvider();
  const providerLabel = labelProvider(provider);
  const player = new AudioPlayer();
  const startedAt = Date.now();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Testing ${providerLabel}`,
    message: "Synthesizing a short sample",
    primaryAction: {
      title: "Stop Test",
      shortcut: { modifiers: ["cmd"], key: "." },
      onAction: () => {
        player.stopPlayback();
        stopExternalPlayback();
      },
    },
  });

  try {
    const result = await synthesizeCurrentProvider(provider, player.signal);
    if (player.isStopped()) {
      toast.style = Toast.Style.Success;
      toast.title = "Voice test stopped";
      toast.message = providerLabel;
      return;
    }

    toast.title = `Playing ${providerLabel}`;
    toast.message = `${result.voiceLabel} · ${result.synthMs}ms synth · ${formatBytes(result.bytes)}`;
    await player.playAudio(result.audio, result.format, result.playbackRate);
    if (player.isStopped()) {
      toast.style = Toast.Style.Success;
      toast.title = "Voice test stopped";
      toast.message = result.providerLabel;
      return;
    }

    const totalMs = Date.now() - startedAt;
    const latencyWarning = getLatencyWarning(result.synthMs, totalMs);
    toast.style = Toast.Style.Success;
    toast.title = latencyWarning ? "Voice setup works, but is slow" : "Voice setup works";
    toast.message = `${result.providerLabel} · ${result.modelLabel} · ${result.synthMs}ms synth · ${totalMs}ms total${
      latencyWarning ? ` · ${latencyWarning}` : ""
    }`;
    await showHUD(
      `${latencyWarning ? "Voice test slow" : "Voice test OK"} · ${result.providerLabel} · ${result.synthMs}ms synth`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Voice setup test failed";
    toast.message = message;
    toast.primaryAction = getConfigurationAction(message);
  } finally {
    player.cleanup();
  }
}

async function synthesizeCurrentProvider(provider: TTSProvider, signal: AbortSignal): Promise<VoiceSetupResult> {
  const startedAt = Date.now();

  if (provider === "mimo") {
    const options = await buildMimoOptions();
    const audio = await synthesizeMimo(TEST_TEXT, options, signal);
    const bytes = Buffer.from(audio, "base64").length;
    return {
      provider,
      providerLabel: labelProvider(provider),
      modelLabel: getMimoModelLabel(options.model),
      voiceLabel: getMimoVoiceById(options.voice)?.name ?? options.voice,
      audio,
      format: "wav",
      playbackRate: options.playbackRate,
      synthMs: Date.now() - startedAt,
      bytes,
    };
  }

  if (provider === "openai") {
    const options = await buildOpenAIOptions();
    const audio = await synthesizeOpenAI(TEST_TEXT, options, signal);
    const bytes = Buffer.from(audio, "base64").length;
    return {
      provider,
      providerLabel: labelProvider(provider),
      modelLabel: getOpenAIModelLabel(options.model),
      voiceLabel: getOpenAIVoiceById(options.voice)?.name ?? options.voice,
      audio,
      format: options.format,
      playbackRate: options.playbackRate,
      synthMs: Date.now() - startedAt,
      bytes,
    };
  }

  const options = await buildQwenOptions();
  const audio = await synthesizeQwen(TEST_TEXT, options, signal);
  const bytes = Buffer.from(audio, "base64").length;
  return {
    provider: "qwen",
    providerLabel: labelProvider("qwen"),
    modelLabel: getQwenModelLabel(options.model),
    voiceLabel: getQwenVoiceById(options.voice)?.name ?? options.voice,
    audio,
    format: options.format,
    playbackRate: options.playbackRate,
    synthMs: Date.now() - startedAt,
    bytes,
  };
}

function labelProvider(provider: TTSProvider): string {
  if (provider === "qwen") return "Qwen-TTS";
  if (provider === "mimo") return "MiMo";
  if (provider === "openai") return "OpenAI";
  return "Qwen-TTS";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}

function getLatencyWarning(synthMs: number, totalMs: number): string | null {
  if (synthMs > SLOW_SYNTH_WARNING_MS) {
    return "slow synthesis";
  }
  if (totalMs > SLOW_TOTAL_WARNING_MS) {
    return "slow playback path";
  }
  return null;
}

function getConfigurationAction(message: string) {
  if (isCredentialError(message)) {
    return {
      title: "Open API Key Preferences",
      icon: Icon.Key,
      onAction: openExtensionPreferences,
    };
  }

  return {
    title: "Setup Voice Defaults",
    icon: Icon.Gauge,
    onAction: () => launchCommand({ name: "setup-voice-defaults", type: LaunchType.UserInitiated }),
  };
}

function isCredentialError(message: string): boolean {
  return /\b(api\s*)?key\b/i.test(message);
}
