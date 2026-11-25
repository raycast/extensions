import { randomUUID } from "node:crypto";
import process from "node:process";
import { LocalStorage } from "@raycast/api";
import { groupBy } from "lodash";
import {
  checkIfSayIsRunning as nativeCheckIfSayIsRunning,
  getAudioDevices as nativeGetAudioDevices,
  getVoices as nativeGetVoices,
  killRunningSay as nativeKillRunningSay,
  say as nativeSay,
} from "native-say";
import type { SayOptions, Voice as NativeVoice, WindowsSayOptions, WindowsVoice } from "native-say";
import { autoDetectWithAI, isAutoDetectVoice, maxRate, minRate } from "./constants.js";
import { getMacVoices, getRunningMacSpeech, sayMacVoice, stopMacSpeech, type MacVoice } from "./macSpeech.js";

export type { Device, SayOptions } from "native-say";

export type Voice = {
  identifier?: string;
  name: string;
  languageCode: string;
  example: string;
  description?: string;
  gender?: string;
  age?: string;
  enabled?: boolean;
  quality?: MacVoice["quality"];
  isSiri?: boolean;
  siriVoiceNumber?: number;
};

export const isMacOS = process.platform === "darwin";
export const isWindows = process.platform === "win32";
export const supportsAudioDeviceSelection = isMacOS;

const windowsMinRate = -10;
const windowsMaxRate = 10;
const lastStopKey = "lastSpeechStop";
const getLastStop = () => LocalStorage.getItem<string>(lastStopKey);

const toWindowsRate = (rate?: number) => {
  if (rate === undefined) return undefined;
  if (rate >= windowsMinRate && rate <= windowsMaxRate) return rate;

  const clampedRate = Math.min(maxRate, Math.max(minRate, rate));
  const scale = (windowsMaxRate - windowsMinRate) / (maxRate - minRate);
  return Math.round((clampedRate - minRate) * scale + windowsMinRate);
};

const toWindowsSayOptions = (options: SayOptions = {}): WindowsSayOptions => ({
  voice: options.voice,
  rate: toWindowsRate(options.rate),
  volume: options.volume,
  outputFile: options.outputFile,
  skipRunningCheck: options.skipRunningCheck,
});

const normalizeWindowsLanguageCode = (culture: string) => culture.replaceAll("-", "_");

const getWindowsVoiceExampleName = (voiceName: string) =>
  voiceName.replace(/^Microsoft\s+/i, "").replace(/\s+Desktop$/i, "");

const isWindowsVoice = (voice: NativeVoice): voice is WindowsVoice => "culture" in voice;

const normalizeWindowsVoice = (voice: WindowsVoice): Voice => ({
  name: voice.name,
  languageCode: normalizeWindowsLanguageCode(voice.culture),
  example: `Hello! My name is ${getWindowsVoiceExampleName(voice.name)}.`,
  description: voice.description,
  gender: voice.gender,
  age: voice.age,
  enabled: voice.enabled,
});

export const say = async (text: string, options?: SayOptions) => {
  const lastStop = await getLastStop();
  const wasStopped = async () => (await getLastStop()) !== lastStop;

  if (isAutoDetectVoice(options?.voice)) {
    const { detectVoice } = await import("./detectVoice.js");
    const voice = await detectVoice(
      text,
      options?.voice === autoDetectWithAI,
      isMacOS ? options?.inputFile : undefined,
    );
    if (await wasStopped()) return;
    options = { ...options, voice };
  }

  if (!options?.skipRunningCheck) await stopPlayback();
  if (isMacOS && options?.voice?.startsWith("com.apple.")) {
    await sayMacVoice(text, options.voice, options, wasStopped);
    return;
  }

  if (await wasStopped()) return;
  await nativeSay(text, { ...(isWindows ? toWindowsSayOptions(options) : options), skipRunningCheck: true });
};

const macVoiceTraits = ({ quality, isSiri, shortName }: MacVoice) => ({
  quality,
  isSiri,
  siriVoiceNumber: isSiri ? Number(shortName.match(/\d+/)?.[0] ?? 0) : undefined,
});

export const getVoices = async (): Promise<Voice[]> => {
  const [voices, macVoices] = await Promise.all([nativeGetVoices(), isMacOS ? getMacVoices() : []]);
  const normalized = voices.map((voice) => (isWindowsVoice(voice) ? normalizeWindowsVoice(voice) : voice));
  if (!isMacOS) return normalized;

  // say can list the same selectable name more than once with different
  // examples. Deduplicate by the value accepted by say, rather than the row.
  const legacyNames = new Set<string>();
  const legacyVoices = normalized.filter((voice) => {
    if (legacyNames.has(voice.name)) return false;
    legacyNames.add(voice.name);
    return true;
  });
  const modernVoices = [...new Map(macVoices.map((voice) => [voice.identifier, voice])).values()];
  const byLegacyName = groupBy(modernVoices, (voice) => voice.legacyName);
  return [
    ...legacyVoices.map((voice) => {
      const variants = byLegacyName[voice.name];
      return variants?.length === 1 ? { ...voice, ...macVoiceTraits(variants[0]) } : voice;
    }),
    ...modernVoices
      // Keep distinct quality variants when a legacy name cannot identify one
      // voice unambiguously. Existing saved names remain available above.
      .filter(
        (voice) => !voice.legacyName || !legacyNames.has(voice.legacyName) || byLegacyName[voice.legacyName].length > 1,
      )
      .map((voice) => ({
        identifier: voice.identifier,
        name: `${voice.name} [${voice.quality}]`,
        languageCode: voice.language.replaceAll("-", "_"),
        example: `Hello! My name is ${voice.isSiri ? "Siri" : voice.shortName}.`,
        ...macVoiceTraits(voice),
      })),
  ];
};

export const getAudioDevices = nativeGetAudioDevices;

export const checkIfSayIsRunning = async () => {
  if (isMacOS) {
    const [speech] = await getRunningMacSpeech();
    if (speech) return speech;
  }
  return nativeCheckIfSayIsRunning();
};

const stopPlayback = async () => {
  if (isMacOS) await stopMacSpeech();
  await nativeKillRunningSay();
};

export const killRunningSay = async () => {
  // All commands share this marker. Playback replacement must not change it.
  try {
    await LocalStorage.setItem(lastStopKey, randomUUID());
  } finally {
    await stopPlayback();
  }
};
