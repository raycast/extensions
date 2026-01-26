export interface Preferences {
  maxRecordingDuration: string;
  audioQuality: "16kHz" | "44kHz";
  chunkDuration: string;
  decodingMethod: "greedy" | "beam";
  autoCapitalize: boolean;
  autoPunctuation: boolean;
  addSpaceAfter: boolean;
  showProgressBar: boolean;
  debugMode: boolean;
}

export function getNumericPreference(
  value: string,
  defaultValue: number,
): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function getSampleRate(quality: "16kHz" | "44kHz"): number {
  return quality === "16kHz" ? 16000 : 44100;
}
