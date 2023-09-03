import { RecordingPreferences } from "~/types/recording";

export const DEFAULT_RECORDING_OPTIONS = {
  framesPerSecond: 30,
  showCursor: true,
  highlightClicks: false,
  videoCodec: "h264",
} satisfies RecordingPreferences;
