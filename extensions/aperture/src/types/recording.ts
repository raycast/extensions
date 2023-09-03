import { ApertureOptions } from "~/types/aperture";

export type Recording = {
  pid: number;
  filePath: string;
  startTime: Date;
  aperturePid: string;
};

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const VIDEO_CODEC = {
  h264: "h264",
  hevc: "hevc",
  proRes422: "proRes422",
  proRes4444: "proRes4444",
} as const;

export type VideoCodec = (typeof VIDEO_CODEC)[keyof typeof VIDEO_CODEC];

export type RecordingOptions = Pick<
  ApertureOptions,
  "framesPerSecond" | "showCursor" | "highlightClicks" | "audioDeviceId" | "screenId"
> & {
  cropArea?: CropArea;
  videoCodec?: VideoCodec;
};

export type RecordingPreferences = Pick<
  RecordingOptions,
  "framesPerSecond" | "videoCodec" | "highlightClicks" | "showCursor"
>;
