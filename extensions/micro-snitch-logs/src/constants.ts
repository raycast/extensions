import { homedir } from "os";
import { join } from "path";

export const LOG_FILE_PATH = join(homedir(), "Library", "Logs", "Micro Snitch.log");

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const TIMESTAMP_REGEX = /^(\d+ \w+ \d+ at \d+:\d+:\d+): (.+)$/;
export const AUDIO_DEVICE_REGEX = /Audio Device [^:]*: (.+)$/;
export const VIDEO_DEVICE_REGEX = /Video Device [^:]*: (.+)$/;
