import { homedir } from "os";
import path from "path";

export const IMAGE_EXTENSIONS = [
  ".cr2",
  ".cr3",
  ".arw",
  ".nef",
  ".dng",
  ".jpg",
  ".jpeg",
  ".heic",
];
export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".mxf"];
export const SIDECAR_EXTENSIONS = [".xmp"];
export const ALL_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...SIDECAR_EXTENSIONS,
];
export const MEDIA_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

export const DEFAULT_DESTINATION = path.join(homedir(), "Pictures");
export const LOG_FILE = path.join(
  homedir(),
  "Library",
  "Logs",
  "raycast-photo-ingest.log",
);
export const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10 MB

export const EXIF_DATE_TAGS = [
  "DateTimeOriginal",
  "CreateDate",
  "MediaCreateDate",
  "FileModifyDate",
] as const;
