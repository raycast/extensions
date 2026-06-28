export interface Preferences {
  serverUrl?: string;
  voice?: string;
  speed?: string;
  outputFormat: "wav" | "mp3" | "m4a" | "flac";
  saveAudioFiles?: boolean;
}
