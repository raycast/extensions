export interface NestCamera {
  id: string;
  name: string;
  roomHint: string;
  traits: {
    online: boolean;
    streamingSupport: "WEB_RTC" | "RTSP" | "NONE";
  };
}

export interface WindowPosition {
  display: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StreamOptions {
  autoplay?: boolean;
  fullscreen?: boolean;
  pipMode?: boolean;
  position?: WindowPosition;
}

export enum StreamErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  STREAM_LIMIT_REACHED = "STREAM_LIMIT_REACHED",
  CAMERA_OFFLINE = "CAMERA_OFFLINE",
  STREAM_TOKEN_EXPIRED = "STREAM_TOKEN_EXPIRED",
  UNKNOWN = "UNKNOWN",
}

export interface RtspStreamResponse {
  url: string;
  expirationTime: Date;
  extensionToken: string;
}

export interface FFmpegConfig {
  rtspTransport: "tcp";
  reconnectOptions: {
    attempts: number;
    delay: number;
    maxDelay: number;
  };
  hlsOptions: {
    segmentDuration: number;
    listSize: number;
    flags: string[];
    outputDir: string;
  };
}

export interface HlsServerConfig {
  port: number;
  host: string;
  outputDir: string;
}

export interface StreamStatus {
  isActive: boolean;
  pid?: number;
  url?: string;
  error?: Error;
  segmentCount?: number;
  lastError?: string;
  startTime?: number;
  startupTime?: number;
}

// New interfaces for Nest API responses
export interface NestDeviceListResponse {
  devices: NestDeviceData[];
}

export interface NestDeviceData {
  name: string;
  type: string;
  traits: NestDeviceTraits;
  parentRelations?: NestParentRelation[];
  assignee?: string;
}

export interface NestDeviceTraits {
  [key: string]: unknown;
  "sdm.devices.traits.Info"?: {
    customName?: string;
  };
  "sdm.devices.traits.Connectivity"?: {
    status?: string;
  };
  "sdm.devices.traits.CameraLiveStream"?: {
    supportedProtocols?: string[];
    videoCodecs?: string[];
  };
}

export interface NestParentRelation {
  displayName?: string;
  parent?: string;
}
