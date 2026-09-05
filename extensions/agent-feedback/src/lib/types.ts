export interface ProcessIdentity {
  pid: number;
  executable: string;
  startedAt: string;
}

export interface RecordingState {
  recorder: ProcessIdentity;
  frameCapture: ProcessIdentity;
  domContext?: DomContextBridgeState;
  startedAt: string;
  sessionDir: string;
  videoPath: string;
  sourceApplication?: string;
  sourceBundleId?: string;
}

export interface DomContextBridgeState {
  process: ProcessIdentity;
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
