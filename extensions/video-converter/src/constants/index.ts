export const FFMPEG_PATHS = {
  default: "/usr/local/bin/ffmpeg",
  alternative: "/opt/homebrew/bin/ffmpeg",
} as const;

export const CONVERSION_STATUS = {
  CONVERTING: "converting",
  DONE: "done",
  ERROR: "error",
  QUEUED: "queued",
  CANCELLED: "cancelled",
} as const;

export const ERROR_MESSAGES = {
  FFMPEG_NOT_FOUND: "FFmpeg is not installed. Please install it to use this extension.",
  CONVERSION_FAILED: "Conversion failed. Please check the file format and try again.",
  INVALID_FORMAT: "Invalid video format selected.",
  INVALID_CODEC: "Selected codec is not supported for this format.",
  FILE_TOO_LARGE: "File size exceeds the maximum limit.",
  INVALID_BITRATE: "Invalid bitrate value. Please enter a valid number.",
} as const;

export const LOADING_MESSAGES = {
  INITIALIZING: "Initializing conversion...",
  CONVERTING: "Converting video...",
  FINALIZING: "Finalizing conversion...",
} as const;
