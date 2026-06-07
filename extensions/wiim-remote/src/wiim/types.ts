/**
 * WiiM Device connection details
 * Used to specify which device to communicate with and store device metadata
 */
export interface WiiMDevice {
  ip: string;
  port: number;
}

/**
 * Current playback status from the WiiM device
 * Retrieved via /httpapi.asp?command=getPlayerStatus
 */
export interface PlayerStatus {
  type: keyof typeof DeviceType;
  ch: keyof typeof DeviceChannel;
  mode: keyof typeof DeviceMode;
  loop: keyof typeof LoopMode;
  eq: number;
  status: "play" | "pause" | "stop" | "loading";
  currentPosition: number;
  offsetPosition: number;
  totalLength: number;
  alarm: boolean;
  playlistLength: number;
  playlistIndex: number;
  vol: number;
  mute: boolean; // 0=unmuted, 1=muted, converted to boolean
}

export const DeviceType = {
  MASTER: "0",
  SLAVE: "1",
} as const;

export const DeviceChannel = {
  STEREO: "0",
  LEFT: "1",
  RIGHT: "2",
} as const;

export const DeviceMode = {
  NONE: "0",
  AIRPLAY: "1",
  DLNA: "2",
  // 10-20 Wiimu playlist types
  PLAYLIST_WIIMU: "10",
  PLAYLIST_USB: "11",
  PLAYLIST_TF: "16",
  // 20-30 reserved
  SPOTIFY_CONNECT: "31",
  TIDAL_CONNECT: "32",
  AUX_IN: "40",
  BLUETOOTH: "41",
  EXTERNAL_STORAGE: "42",
  OPTICAL: "43",
  MIRROR: "50",
  VOICE_MAIL: "60",
  SLAVE: "99",
} as const;

export const LoopMode = {
  ALL: "0",
  SINGLE: "1",
  SHUFFLE_LOOP: "2",
  SHUFFLE_NO_LOOP: "3",
  NO_SHUFFLE_NO_LOOP: "4",
} as const;

export function mapConstType<const T extends Record<string, string>>(
  source: T,
  raw: unknown,
  fallback: keyof T,
): keyof T {
  const code = String(raw);
  const key = (Object.keys(source) as Array<keyof T>).find((k) => source[k] === code);
  return key ?? fallback;
}

/**
 * Metadata information about the currently playing track on the WiiM device
 * Retrieved via /httpapi.asp?command=getMetaInfo
 */
export interface MetaInfo {
  album: string;
  title: string;
  subtitle: string;
  artist: string;
  albumArtURI: string;
  sampleRate: number;
  bitDepth: number;
  bitRate: number;
  trackId: string;
}

/**
 * System information about the WiiM device
 * Retrieved via /httpapi.asp?command=getSystemInfo
 */
export interface SystemInfo {
  ssid: string;
  firmware: string;
  macAddress: string;
  internet: boolean;
  uuid: string;
  groupName: string;
  deviceName: string;
}

/** Supported audio input sources */
export type InputSource = "line-in" | "bluetooth" | "optical" | "usb" | "wifi";

/** Generic API response types */
export type ApiResponse = string | Record<string, string | number | boolean>;

/** Error response from WiiM API */
export interface ApiErrorResponse {
  errorCode: number;
  errorMessage: string;
}
