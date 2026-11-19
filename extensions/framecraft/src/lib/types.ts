export type SubtitleMode = "primary" | "bilingual" | "clean";

export interface RuntimeConfig {
  jellyfinUrl: string;
  jellyfinApiKey: string;
  jellyfinUsername: string;
  saveDirectory: string;
  defaultSubtitleMode: SubtitleMode;
  ffmpegPath: string;
  ffprobePath: string;
  bypassProxy: boolean;
  copyToClipboard: boolean;
  supportPath: string;
  assetsPath: string;
}

export type MediaSourceKind = "iina-local" | "iina-stream" | "quicktime-local" | "infuse-local" | "jellyfin-remote";

export interface SubtitleStreamMeta {
  pid?: number;
  /** Global stream index in container (e.g. 0:5 -> index = 5) */
  index: number;
  /** 0-based subtitle stream ordinal (e.g. 0:s:0 -> subOrdinal = 0) */
  subOrdinal: number;
  codec: string;
  language: string;
  title: string;
  isBitmap: boolean;
  isChinese: boolean;
  isEnglish: boolean;
}

export interface VideoColorInfo {
  width: number;
  height: number;
  pixFmt: string;
  colorSpace?: string;
  colorTransfer?: string;
  colorPrimaries?: string;
  isHdr: boolean;
  isPq: boolean;
}

export interface PlaybackProbeResult {
  /** Container reported by the media server, when available. */
  container?: string;
  durationSec?: number;
  sizeBytes?: number;
  bitrateBps?: number;
  playbackObservation?: {
    triggerAt?: string;
    requestStartedAt?: string;
    responseAt?: string;
    capturedAt: string;
    reportedAt?: string;
    isPaused?: boolean;
    client?: string;
    device?: string;
  };
  playlist?: number;
  source: MediaSourceKind;
  playerLabel: string;
  movieName: string;
  mediaTarget: string;
  isRemote: boolean;
  positionSec: number;
  itemId?: string;
  mediaSourceId?: string;
  subtitles: SubtitleStreamMeta[];
}

export interface CaptureFlags {
  mode: SubtitleMode;
  cinemaBar: boolean;
  alignTop: boolean;
}

export interface ExtractedLayer {
  id: string;
  index: number;
  subOrdinal: number;
  language: string;
  title: string;
  codec: string;
  kind: "bitmap" | "text";
  visible: boolean;
  yOffset: number;
  isChinese: boolean;
  isEnglish: boolean;
  /** Relative filename in project cache dir for transparent RGBA bitmap layer */
  bitmapFilename?: string;
  /** Byte size of extracted transparent PNG (used to detect non-empty active lines) */
  bitmapBytes?: number;
  hasActiveContent: boolean;
  /** True when the track contains zero data across the inspected window */
  isEmptyTrack?: boolean;
  /** Editable text for SRT/ASS/VTT or Vision-OCR converted PGS */
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fillColor?: string;
  strokeColor?: string;
  ocrSourceBitmap?: string;
}

export interface CaptureProjectManifest {
  exportSignatures?: Record<string, string>;
  /** Background subtitle composition is a second, independent task. */
  composeState?: ComposeState;
  composeError?: string;
  id: string;
  createdAt: string;
  movieName: string;
  timestampSec: number;
  timestampFormatted: string;
  source: MediaSourceKind;
  colorInfo: VideoColorInfo;
  cinemaBar: boolean;
  alignTop: boolean;
  projectDir: string;
  cleanPngPath: string;
  subbedPngPath: string;
  layeredSvgPath: string;
  layers: ExtractedLayer[];
}

export interface ScreenshotQueueTask {
  captureRequestId?: string;
  id: string;
  type: "screenshot";
  createdAt: number;
  probe: PlaybackProbeResult;
  flags: CaptureFlags;
  config: RuntimeConfig;
  /** Set on the follow-up task that burns subtitles onto an already saved frame.
   * It reuses the parent's project directory and history entry. */
  composeFor?: string;
}

export interface ComposeQueueTask {
  id: string;
  type: "compose";
  createdAt: number;
  probe: PlaybackProbeResult;
  flags: CaptureFlags;
  config: RuntimeConfig;
  /** Screenshot project whose clean frame is already on disk. */
  parentId: string;
}
export interface ClipQueueTask {
  id: string;
  type: "clip";
  createdAt: number;
  probe: PlaybackProbeResult;
  startSec: number;
  endSec: number;
  durationSec: number;
  burnSubtitles: boolean;
  config: RuntimeConfig;
}

export type QueueTask = ScreenshotQueueTask | ClipQueueTask | ComposeQueueTask;

export type ComposeState = "pending" | "running" | "done" | "failed";

export interface ClipInState {
  startSec: number;
  movieName: string;
  mediaTarget: string;
  markedAt: number;
}

export interface ActiveWorkerState {
  pid: number;
  startedAt: number;
  stage: string;
  task: QueueTask;
}

export interface HistoryEntry {
  captureRequestId?: string;
  playlist?: number;
  exportSignatures?: Record<string, string>;
  exportState?: { modified?: boolean; missing: string[] };
  status?: "completed" | "failed";
  errorMessage?: string;
  /** Which queue produced this row, so the list can name the task kind. */
  taskKind?: "screenshot" | "clip" | "compose";
  /** Human-readable target (kind + time or clip range). */
  failureLabel?: string;
  composeState?: ComposeState;
  composeError?: string;
  id: string;
  type: "screenshot" | "clip" | "compose";
  movieName: string;
  timestampLabel: string;
  createdAt: string;
  source: MediaSourceKind;
  isHdr?: boolean;
  cleanPngPath?: string;
  subbedPngPath?: string;
  layeredSvgPath?: string;
  clipMkvPath?: string;
  sizeMb?: number;
  manifestPath?: string;
  trackCount?: number;
}
