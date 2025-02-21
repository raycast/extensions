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
  UNKNOWN = "UNKNOWN"
}

export interface RtspStreamResponse {
  url: string;
  expirationTime: Date;
  extensionToken: string;
}

export interface FFmpegConfig {
  rtspTransport: 'tcp';
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
} 