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
  domContext?: DomContextBridgeState;
  startedAt: string;
  sessionDir: string;
  videoPath: string;
  sourceApplication?: string;
  sourceBundleId?: string;
}

export interface DomContextBridgeState {
  pid: number;
  port: number;
  eventsPath: string;
  statusPath: string;
}

export interface DomContextTarget {
  kind: "hover";
  clientId: string;
  capturedAt: string;
  timestampMs: number;
  pageUrl: string;
  tag: string;
  signature: string;
  selector: string;
  text: string;
  attributes: Record<string, string>;
  classNames: string[];
  ancestors: string[];
  rect: { x: number; y: number; width: number; height: number };
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
