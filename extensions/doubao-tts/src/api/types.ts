export interface TTSOptions {
  speaker: string;
  speechRate: number;
  format: string;
  sampleRate: number;
}

export interface VoiceConfig {
  id: string;
  name: string;
  gender: "female" | "male" | "child";
  category: string;
  free: boolean;
  model: "seed-tts-1.0" | "seed-tts-2.0";
}
