import os from "node:os";
import { Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { minRate, maxRate } from "./constants.js";
import { systemDefault } from "./constants.js";
import { Voice, getVoices, isWindows } from "./speech.js";
import { ParsedSaySettings, StoredSaySettings } from "./types.js";

export { getSpeechPlist } from "./systemSpeech.js";

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

const getSaySettings = () => {
  const voice = getCache("voice");
  const rate = getCache("rate");
  const audioDevice = getCache("audioDevice");
  const keepSilentOnError = getCache("keepSilentOnError");
  return { voice, rate, audioDevice, keepSilentOnError };
};

const parseSaySettings = (settings: StoredSaySettings): ParsedSaySettings => {
  const { voice, rate, audioDevice, keepSilentOnError } = settings;
  return {
    voice: voice === systemDefault ? undefined : voice,
    rate: rate === systemDefault ? undefined : parseInt(rate, 10),
    audioDevice: audioDevice === systemDefault ? undefined : audioDevice,
    keepSilentOnError,
  };
};

export const getParsedSaySettings = (): ParsedSaySettings => parseSaySettings(getSaySettings());

export const getSortedVoices = async () => {
  const originalVoices = await getVoices();
  return originalVoices.sort((a, b) => {
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
  const countryCode = languageCode.split(/[-_]/).at(-1);
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) return undefined;
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export const languageCodeToLanguageName = (languageCode: string) => {
  const languageCodePart = languageCode.split(/[-_]/)[0];
  return new Intl.DisplayNames(["en"], { type: "language" }).of(languageCodePart) ?? "Other";
};

export const voiceNameToEmojiFlag = (voices: Voice[], voiceName?: string) => {
  if (!voiceName) return undefined;
  const foundVoice = voices.find((v) => v.identifier === voiceName || v.name === voiceName);
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

export const getSystemSettingsName = () => (isWindows ? "Windows Settings" : "System Settings");

export const getSystemSettingsUrl = () =>
  isWindows ? "ms-settings:speech" : "x-apple.systempreferences:com.apple.preference.universalaccess";

export const getConfigureSpeechTitle = () => (isWindows ? "Configure Speech" : "Configure Spoken Content");

export const getAdvancedMessage = () => {
  if (isWindows) {
    return "This configuration page does not alter your system settings. For more advanced configurations please go to Windows Settings -> Time & language -> Speech.";
  }

  const menuTitle = os.release().startsWith("25") ? "Live Speech" : "Spoken Content";
  return `This configuration page does not alter your system settings. For more advanced configurations please go to System Settings -> Accessibility -> ${menuTitle}.`;
};
