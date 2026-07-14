export interface Transcription {
  id: string;
  text: string;
  enhancedText: string | null;
  timestamp: number;
  duration: number;
  modelName: string | null;
  powerModeName: string | null;
  powerModeEmoji: string | null;
}
