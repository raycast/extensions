import { getPreferenceValues } from "@raycast/api";
import path from "node:path";

export const presets = {
  "slowed-reverb": { title: "Slowed + Reverb", rateEffect: "speed", reverb: true },
  slowed: { title: "Slowed", rateEffect: "speed", reverb: false },
  reverb: { title: "Reverb", rateEffect: undefined, reverb: true },
  nightcore: { title: "Nightcore", rateEffect: "speed", reverb: false },
  tempo: { title: "Tempo (Keep Pitch)", rateEffect: "tempo", reverb: false },
  convert: { title: "Format Only", rateEffect: undefined, reverb: false },
};

export type Preset = keyof typeof presets;
export const formats = ["mp3", "wav", "flac"] as const;
export type OutputFormat = (typeof formats)[number];

export function isPreset(value: string): value is Preset {
  return Object.hasOwn(presets, value);
}

export function isOutputFormat(value: string): value is OutputFormat {
  return formats.some((format) => format === value);
}

export function getDefaultSpeed(preset: Preset) {
  const preferences = getPreferenceValues<Preferences>();
  if (preset === "nightcore") return Number(preferences.defaultNightcoreSpeed || "1.2");
  return Number(preferences.defaultSlowedSpeed || "0.8");
}

export function getDefaultFormat(): OutputFormat {
  const { defaultOutputFormat } = getPreferenceValues<Preferences>();
  if (defaultOutputFormat && isOutputFormat(defaultOutputFormat)) return defaultOutputFormat;
  return process.platform === "win32" ? "wav" : "mp3";
}

export type AudioOptions = {
  preset: Preset;
  format?: OutputFormat;
  speed?: number;
  reverb?: number;
  outputDirectory?: string;
};

export function resolveAudioOptions(options: AudioOptions) {
  if (!isPreset(options.preset)) throw new Error("Choose a supported audio preset.");
  const { rateEffect, reverb: supportsReverb } = presets[options.preset];
  const format = options.format ?? getDefaultFormat();
  if (!isOutputFormat(format)) throw new Error("Choose MP3, WAV, or FLAC for the output.");

  if (options.speed !== undefined && !rateEffect) throw new Error("This preset does not use a speed multiplier.");
  if (options.reverb !== undefined && !supportsReverb) throw new Error("This preset does not use reverb.");

  const speed = rateEffect ? (options.speed ?? getDefaultSpeed(options.preset)) : undefined;
  if (speed !== undefined && (!Number.isFinite(speed) || speed < 0.5 || speed > 2)) {
    throw new Error("Enter a speed between 0.5 and 2.");
  }

  const reverb = supportsReverb ? (options.reverb ?? 50) : undefined;
  if (reverb !== undefined && (!Number.isFinite(reverb) || reverb < 0 || reverb > 100)) {
    throw new Error("Enter a reverb amount between 0 and 100.");
  }

  if (options.outputDirectory !== undefined && !path.isAbsolute(options.outputDirectory)) {
    throw new Error("Use an absolute path for the output folder.");
  }

  const effects: string[] = [];
  if (rateEffect && speed !== undefined) effects.push(rateEffect, String(speed));
  if (reverb !== undefined && reverb > 0) effects.push("reverb", String(reverb), "50", "100", "100", "20", "0");

  return { ...options, format, speed, reverb, effects };
}
