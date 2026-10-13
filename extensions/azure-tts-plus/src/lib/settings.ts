// No @raycast/api import on purpose: this module is bundled into the background
// worker, which runs outside Raycast and would crash on the first import.
import {
  Engine,
  ensureDirs,
  readJson,
  settingsFile,
  writeJsonAtomic,
} from "./state.js";

export type Settings = {
  engine: Engine;
  /** Azure voice short name, e.g. "pt-BR-FranciscaNeural". */
  azureVoice: string;
  /** SAPI voice name, e.g. "Microsoft Maria Desktop". Empty means the system default. */
  windowsVoice: string;
  /** Speaking rate as a multiplier of the natural pace. */
  rate: number;
  /** Show the floating reader that highlights each word. */
  overlay: boolean;
};

export const minRate = 0.5;
export const maxRate = 2.5;
export const rateStep = 0.1;

export const defaultSettings: Settings = {
  engine: "windows",
  azureVoice: "pt-BR-FranciscaNeural",
  windowsVoice: "",
  rate: 1,
  overlay: true,
};

export const clampRate = (rate: number) =>
  Math.round(Math.min(maxRate, Math.max(minRate, rate)) * 10) / 10;

export const loadSettings = (): Settings => {
  const stored = readJson<Partial<Settings>>(settingsFile) ?? {};
  const merged = { ...defaultSettings, ...stored };
  return { ...merged, rate: clampRate(merged.rate) };
};

export const saveSettings = (settings: Settings) => {
  ensureDirs();
  writeJsonAtomic(settingsFile, settings);
};

export type AzureCredentials = { key: string; region: string };

/** Azure is only usable once a key is present; without one we fall back to the Windows engine. */
export const resolveEngine = (
  settings: Settings,
  credentials: AzureCredentials | undefined,
): Engine => (settings.engine === "azure" && credentials ? "azure" : "windows");

/** "pt-BR-FranciscaNeural" reads better in a header as "FRANCISCA". */
export const shortVoiceName = (engine: Engine, settings: Settings) => {
  if (engine === "azure") {
    const parts = settings.azureVoice.split("-");
    return (parts.at(-1) ?? settings.azureVoice)
      .replace(/Neural$/i, "")
      .replace(/Multilingual$/i, "");
  }
  return (
    settings.windowsVoice
      .replace(/^Microsoft\s+/i, "")
      .replace(/\s+Desktop$/i, "") || "System"
  );
};

/**
 * The panel header: engine and voice only. The speed is not in here on purpose — the
 * panel owns a speed control of its own and prints the live value next to it.
 */
export const buildLabel = (engine: Engine, settings: Settings) =>
  `${engine === "azure" ? "AZURE" : "WINDOWS"}  ${shortVoiceName(engine, settings).toUpperCase()}`;
