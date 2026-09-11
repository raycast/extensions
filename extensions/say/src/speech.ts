import process from "node:process";
import {
  checkIfSayIsRunning as nativeCheckIfSayIsRunning,
  getAudioDevices as nativeGetAudioDevices,
  getVoices as nativeGetVoices,
  killRunningSay as nativeKillRunningSay,
  say as nativeSay,
} from "native-say";
import type { SayOptions, Voice as NativeVoice, WindowsSayOptions, WindowsVoice } from "native-say";
import { maxRate, minRate } from "./constants.js";

export type { Device, SayOptions } from "native-say";

export type Voice = {
  name: string;
  languageCode: string;
  example: string;
  description?: string;
  gender?: string;
  age?: string;
  enabled?: boolean;
};

export const isMacOS = process.platform === "darwin";
export const isWindows = process.platform === "win32";
export const supportsAudioDeviceSelection = isMacOS;

const windowsMinRate = -10;
const windowsMaxRate = 10;

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
  if (isWindows) {
    await nativeSay(text, toWindowsSayOptions(options));
    return;
  }

  await nativeSay(text, options);
};

export const getVoices = async (): Promise<Voice[]> => {
  const voices = await nativeGetVoices();
  return voices.map((voice) => (isWindowsVoice(voice) ? normalizeWindowsVoice(voice) : voice));
};

export const getAudioDevices = nativeGetAudioDevices;

export const checkIfSayIsRunning = nativeCheckIfSayIsRunning;

export const killRunningSay = nativeKillRunningSay;
