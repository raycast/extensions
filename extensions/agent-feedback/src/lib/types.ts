export interface Preferences {
  whisperModelPath?: string;
  whisperCliPath?: string;
  language: string;
  displayNumber: string;
  maxFrames: string;
}

export interface RecordingState {
  pid: number;
  frameCapturePid?: number;
  startedAt: string;
  sessionDir: string;
  videoPath: string;
  sourceApplication?: string;
  sourceBundleId?: string;
}

export interface FeedbackMarker {
  timestampMs: number;
  screenshotPath: string;
}

export interface TranscriptSegment {
  fromMs: number;
  toMs: number;
  text: string;
}
