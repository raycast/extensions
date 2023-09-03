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
