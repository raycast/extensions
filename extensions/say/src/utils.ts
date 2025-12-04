import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import bplist from "bplist-parser";
import { Voice, getVoices } from "mac-say";
import { minRate, maxRate } from "./constants.js";
import { systemDefault } from "./constants.js";
import { ParsedSaySettings, SpeechPlist, StoredSaySettings } from "./types.js";

const cache = new Cache();

function getCache(key: string): string;
function getCache(key: "keepSilentOnError"): boolean;
function getCache(key: string | "keepSilentOnError"): string | boolean {
  return JSON.parse(cache.get(key) ?? `"${systemDefault}"`);
}

export const useSaySettings = () => {
  const [voice, setVoice] = useCachedState<string>("voice", systemDefault);
  const [rate, setRate] = useCachedState<string>("rate", systemDefault);
  const [device, setAudioDevice] = useCachedState<string>("audioDevice", systemDefault);
  const [keepSilentOnError, setKeepSilentOnError] = useCachedState<boolean>("keepSilentOnError", false);
  return { voice, rate, device, keepSilentOnError, setVoice, setRate, setAudioDevice, setKeepSilentOnError };
};

export const getSaySettings = () => {
  const voice = getCache("voice");
  const rate = getCache("rate");
  const audioDevice = getCache("audioDevice");
  const keepSilentOnError = getCache("keepSilentOnError");
  return { voice, rate, audioDevice, keepSilentOnError };
};

export const parseSaySettings = (settings: StoredSaySettings): ParsedSaySettings => {
  const { voice, rate, audioDevice, keepSilentOnError } = settings;
  return {
    voice: voice === systemDefault ? undefined : voice,
    rate: rate === systemDefault ? undefined : parseInt(rate, 10),
    audioDevice: audioDevice === systemDefault ? undefined : audioDevice,
    keepSilentOnError,
  };
};

export const getSortedVoices = async () => {
  const orignalVoices = await getVoices();
  return orignalVoices.sort((a, b) => {
    if (a.languageCode === b.languageCode) {
      return a.name.localeCompare(b.name);
    }
    if (a.languageCode === "en_US") return -1;
    if (b.languageCode === "en_US") return 1;
    return a.languageCode.localeCompare(b.languageCode);
  });
};

export const languageCodeToEmojiFlag = (languageCode: string) => {
  if (languageCode === "ar_001") return undefined;
  if (languageCode === "en-scotland") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  const codePoints = languageCode
    .slice(-2)
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export const voiceNameToEmojiFlag = (voices: Voice[], voiceName?: string) => {
  if (!voiceName) return undefined;
  const foundVoice = voices.find((v) => v.name === voiceName);
  if (!foundVoice) return undefined;
  return languageCodeToEmojiFlag(foundVoice.languageCode);
};

export const getRates = () => {
  const step = 25;
  const rates = [];
  for (let i = minRate; i <= maxRate; i += step) {
    rates.push(i);
  }
  return rates;
};

export const getSpeechPlist = async () => {
  try {
    const speechPlistPath = path.join(os.homedir(), "Library/Preferences/com.apple.speech.voice.prefs.plist");
    const speechPlistFile = await fs.readFile(speechPlistPath);
    const speechPlistJson = bplist.parseBuffer(speechPlistFile);

    const foundRate = speechPlistJson?.[0]?.VoiceRateDataArray.find(
      ([, voiceId]: number[]) => voiceId === speechPlistJson?.[0]?.SelectedVoiceID,
    );

    return {
      voice: speechPlistJson?.[0]?.SelectedVoiceName,
      rate: foundRate?.[2],
    } as SpeechPlist;
  } catch {
    return undefined;
  }
};

export const getAdvancedMessage = () => {
  const menuTitle = os.release().startsWith("25") ? "Live Speech" : "Spoken Content";
  return `This configuration page does not alter you system settings. For more advanced configurations please go to System Settings -> Accessibility -> ${menuTitle}.`;
};
