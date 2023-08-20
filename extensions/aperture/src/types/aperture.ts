export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VideoCodec = "h264" | "hevc" | "proRes422" | "proRes4444";

export type RecorderCodec = "avc1" | "hvc1" | "apcn" | "ap4h";

export type ApertureOptions = {
  destination?: string;
  framesPerSecond?: number;
  showCursor?: boolean;
  highlightClicks?: boolean;
  audioDeviceId?: string;
  videoCodec?: RecorderCodec;
  screenId?: number;
  cropRect?: [number, number][];
};