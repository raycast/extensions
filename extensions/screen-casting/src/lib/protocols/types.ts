/** Protocols where RameCast streams the screen itself and tells the device to play it. */
export type Protocol = "googlecast" | "dlna" | "roku";

export interface Device {
  protocol: Protocol;
  /** Stable id within the protocol (Cast id, UPnP UDN, Roku serial). */
  id: string;
  name: string;
  model: string;
  host: string;
  port: number;
  /** Protocol-specific details needed to control the device later (e.g. DLNA control URL). */
  meta?: Record<string, string>;
}

/** URLs of the local screen stream, in the formats devices understand. */
export interface StreamUrls {
  /** HLS playlist (Google Cast, Roku). */
  hls: string;
  /** Continuous MPEG-TS stream (DLNA TVs, which often can't play HLS). */
  ts: string;
}

/** What RameCast started on the device, so stopping touches only that and never other playback. */
export interface Playback {
  /** Google Cast receiver session RameCast launched. */
  castSessionId?: string;
  /** Random token in RameCast's stream URL (DLNA: only stop if the TV is still playing it). */
  streamToken?: string;
}

export interface Adapter {
  protocol: Protocol;
  /** Shown as a tag in the device list. */
  label: string;
  /** Find devices, reporting each as soon as it's seen. Resolves when the scan window ends; rejects if the scan can't run. */
  discover(onFound: (device: Device) => void, durationMs: number): Promise<void>;
  play(device: Device, urls: StreamUrls): Promise<Playback>;
  /** Stop RameCast's playback on the device, leaving anything else the user started alone. */
  stop(device: Device, playback: Playback): Promise<void>;
}
