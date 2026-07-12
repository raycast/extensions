export type PlaybackCommand =
  "play" | "pause" | "playpause" | "next" | "previous";

export type SourceOrigin = "media-remote" | "applescript" | "browser";

export interface MediaSource {
  /** bundle id when known, else provider id */
  id: string;
  appName: string;
  bundleId?: string;
  title: string;
  artist?: string;
  album?: string;
  /** absolute path to a locally cached artwork file */
  artworkPath?: string;
  /** seconds */
  duration?: number;
  /** seconds */
  position?: number;
  isPlaying: boolean;
  origin: SourceOrigin;
  url?: string;
}

export interface ProviderCapabilities {
  control: boolean;
  artwork: boolean;
  seek: boolean;
}

export interface SourceProvider {
  id: string;
  displayName: string;
  /** bundle ids this provider can enrich/control (match against media-control output) */
  bundleIds: string[];
  /**
   * When true, this provider only contributes a source if the media-control engine is
   * unavailable. Used for heuristic providers (e.g. browser tab scraping) that can report
   * the wrong/stale tab and would otherwise duplicate media-control's accurate coverage.
   */
  fallbackOnly?: boolean;
  capabilities: ProviderCapabilities;
  isAvailable(): Promise<boolean>;
  getSource(): Promise<MediaSource | null>;
  control?(cmd: PlaybackCommand): Promise<void>;
}

export interface AudioDevice {
  id: string;
  name: string;
  kind: "input" | "output";
  transportType: string;
  isWireless: boolean;
  isDefault: boolean;
  /** 0–1 when the device supports volume */
  volume?: number;
}
