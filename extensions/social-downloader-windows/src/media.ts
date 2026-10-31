export interface MediaFormat {
  format_id: string;
  vcodec?: string | null;
  acodec?: string | null;
  height?: number;
  fps?: number;
  abr?: number;
  tbr?: number;
  ext?: string;
  language?: string;
  format_note?: string;
  has_drm?: boolean;
}

export interface MediaInfo {
  id: string;
  title: string;
  uploader?: string;
  duration?: number;
  formats: MediaFormat[];
  _type?: string;
  is_live?: boolean;
  entries?: MediaInfo[];
}

export function validateUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Paste a valid link from a supported platform.");
  }
  const hosts = [
    "youtube.com",
    "youtu.be",
    "instagram.com",
    "x.com",
    "twitter.com",
    "tiktok.com",
    "facebook.com",
    "fb.watch",
    "reddit.com",
    "redd.it",
    "vimeo.com",
    "twitch.tv",
    "clips.twitch.tv",
    "pinterest.com",
    "pin.it",
  ];
  const host = url.hostname.toLowerCase();
  if (
    !hosts.some((h) => host === h || host.endsWith(`.${h}`)) ||
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error(
      "Use a public link from a supported platform without credentials or a custom port.",
    );
  }
  return url.href;
}

export function videoChoices(formats: MediaFormat[]): MediaFormat[] {
  return formats
    .filter(
      (f) =>
        !f.has_drm &&
        f.vcodec !== "none" &&
        f.height &&
        !["mhtml", "jpg", "jpeg", "png", "webp"].includes(f.ext ?? ""),
    )
    .sort(
      (a, b) =>
        (b.height ?? 0) - (a.height ?? 0) || (b.fps ?? 0) - (a.fps ?? 0),
    );
}

export function hasAudio(format: MediaFormat): boolean {
  return (
    format.acodec !== "none" &&
    Boolean(
      format.acodec ||
      [
        "mp4",
        "webm",
        "mov",
        "mkv",
        "m4a",
        "mp3",
        "opus",
        "ogg",
        "aac",
        "wav",
        "flac",
        "mpeg",
        "ts",
      ].includes(format.ext ?? ""),
    )
  );
}

export function audioChoices(
  formats: MediaFormat[],
  forVideo = false,
): MediaFormat[] {
  return formats
    .filter(
      (f) => !f.has_drm && hasAudio(f) && (!forVideo || f.vcodec === "none"),
    )
    .sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0));
}

export interface DownloadOptions {
  url: string;
  mode: "video" | "audio";
  video: string;
  audio: string;
  container: "mp4" | "mkv" | "mp3" | "m4a";
  bitrate: string;
  destination: string;
  ffmpeg: string;
  filenameTag?: string;
  playlistItem?: number;
  preserveSourceAudio?: boolean;
}
export function playlistSelection(item?: number): string[] {
  if (item === undefined) return [];
  if (!Number.isInteger(item) || item < 1 || item > 200)
    throw new Error("Invalid playlist item.");
  return ["--yes-playlist", "--playlist-items", String(item)];
}

export const commonArgs = [
  "--ignore-config",
  "--js-runtimes",
  `node:${process.execPath}`,
  "--no-playlist",
  "--no-colors",
  "--windows-filenames",
  "--socket-timeout",
  "30",
];

export function downloadArgs(options: DownloadOptions): string[] {
  if (options.filenameTag && !/^[a-f0-9]{8}$/.test(options.filenameTag))
    throw new Error("Invalid download identifier.");
  const args = [
    ...commonArgs.filter(
      (arg) => !options.playlistItem || arg !== "--no-playlist",
    ),
    ...playlistSelection(options.playlistItem),
    "--no-overwrites",
    "--no-simulate",
    "--newline",
    "--progress",
    "--progress-delta",
    "1",
    "--progress-template",
    "download:RC_PROGRESS %(progress)j",
    "--print",
    "after_move:RC_FILE %(filepath)j",
    "-P",
    options.destination,
    "-o",
    `%(title).150B [%(id)s] [%(format_id)s]${options.mode === "audio" ? ` [${options.bitrate}k]` : ""}${options.filenameTag ? ` [${options.filenameTag}]` : ""}.%(ext)s`,
  ];
  if (options.ffmpeg !== "ffmpeg.exe")
    args.push("--ffmpeg-location", options.ffmpeg);
  if (options.mode === "audio") {
    if (
      !["mp3", "m4a"].includes(options.container) ||
      !["128", "192", "256", "320"].includes(options.bitrate) ||
      !options.audio
    )
      throw new Error("Select an audio format, track, and quality.");
    args.push("-f", options.audio);
    if (!options.preserveSourceAudio)
      args.push(
        "--extract-audio",
        "--audio-format",
        options.container,
        "--audio-quality",
        `${options.bitrate}K`,
      );
  } else {
    if (!["mp4", "mkv"].includes(options.container) || !options.video)
      throw new Error("Select a video format and track.");
    args.push(
      "-f",
      options.audio ? `${options.video}+${options.audio}` : options.video,
      "--merge-output-format",
      options.container,
      "--remux-video",
      options.container,
    );
  }
  args.push("--", validateUrl(options.url));
  return args;
}

export type DownloadEvent =
  | { type: "progress"; percent?: number; speed?: number; eta?: number }
  | { type: "file"; path: string };
export function parseEvent(line: string): DownloadEvent | undefined {
  try {
    if (line.startsWith("RC_FILE ")) {
      const path: unknown = JSON.parse(line.slice(8));
      if (typeof path === "string") return { type: "file", path };
    }
    if (line.startsWith("RC_PROGRESS ")) {
      const p = JSON.parse(line.slice(12));
      const total = p.total_bytes || p.total_bytes_estimate;
      return {
        type: "progress",
        percent:
          total > 0
            ? Math.min(100, (p.downloaded_bytes / total) * 100)
            : undefined,
        speed: typeof p.speed === "number" ? p.speed : undefined,
        eta: typeof p.eta === "number" ? p.eta : undefined,
      };
    }
  } catch {
    /* Ignore incomplete or non-JSON diagnostic output. */
  }
}
