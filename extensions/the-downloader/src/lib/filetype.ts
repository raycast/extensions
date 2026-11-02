import { SourceType } from "../types.js";
import { ToolId } from "./tools.js";
import { needsJsRuntime } from "./detect.js";

/** What the user wants out of a URL — the Download form's second field. */
export type Filetype = "image" | "video" | "audio" | "transcript" | "website";

/** Filetype dropdown order (all five are always shown; detection only preselects). */
export const FILETYPES: Filetype[] = ["video", "audio", "image", "transcript", "website"];

/**
 * The Filetype detection preselects for a detected source. `audioPreferred` is the
 * `videoMediaType` preference: a video site defaults to audio when it is set.
 */
export function defaultFiletype(source: SourceType, audioPreferred: boolean): Filetype {
  switch (source) {
    case "gallery":
      return "image";
    case "spotify":
      return "audio";
    case "webpage":
      return "website";
    case "video":
    default:
      return audioPreferred ? "audio" : "video";
  }
}

/** The tool a (source, filetype) selection runs. */
export function resolveTool(source: SourceType, filetype: Filetype): ToolId {
  if (filetype === "website") return "monolith";
  if (filetype === "audio") return source === "spotify" ? "spotdl" : "yt-dlp";
  if (filetype === "image") return source === "gallery" ? "gallery-dl" : "yt-dlp";
  // filetype === "video" || filetype === "transcript"
  return "yt-dlp";
}

/**
 * Per-source capability list: the filetypes that make sense for a detected
 * source. This is the single source of truth the form uses to decide which
 * Filetype options to even show — so a Pinterest (gallery) link only offers
 * Image, never Video/Audio/Transcript (which would hand an image URL to yt-dlp
 * and fail with "No video formats found"). `website` (monolith) is reserved for
 * unrecognized sites, matching detectSource's webpage fall-through; those also
 * offer Video and Audio, since yt-dlp supports many sites beyond the allowlist.
 */
const SUPPORTED: Record<SourceType, Filetype[]> = {
  video: ["video", "audio", "image", "transcript"],
  gallery: ["image"],
  spotify: ["audio"],
  webpage: ["video", "audio", "website"],
};

/** The filetypes a detected source supports, in dropdown order. */
export function supportedFiletypes(source: SourceType): Filetype[] {
  return SUPPORTED[source] ?? FILETYPES;
}

/**
 * Keep `current` when the source supports it; otherwise fall back to the
 * source's sensible default. Used when the URL changes under a filetype the
 * user previously picked (e.g. they had Video selected, then pasted Pinterest).
 */
export function clampFiletype(source: SourceType, current: Filetype, audioPreferred: boolean): Filetype {
  return supportedFiletypes(source).includes(current) ? current : defaultFiletype(source, audioPreferred);
}

/** A short, human note explaining what the detected source supports and why. */
export function filetypeGuidance(source: SourceType): string {
  switch (source) {
    case "gallery":
      return "Image gallery — only Image is available; gallery-dl downloads every image. Video, audio, and transcript aren't offered for this site.";
    case "spotify":
      return "Spotify link — only Audio is available; spotDL fetches the tracks.";
    case "webpage":
      return "Not a known media site — it will be saved as a webpage with monolith. If it hosts a video, choose Video or Audio to try yt-dlp.";
    case "video":
    default:
      return "Video site — choose Video, Audio, Transcript, or the thumbnail Image.";
  }
}

/**
 * Every executable that must exist for a (source, filetype) selection. Deno is
 * required only for YouTube (see `needsJsRuntime`); elsewhere it's optional,
 * so a missing Deno doesn't block Vimeo, Twitch and the like.
 */
export function requiredTools(source: SourceType, filetype: Filetype, url = ""): string[] {
  const tool = resolveTool(source, filetype);
  if (tool === "monolith") return ["monolith"];
  if (tool === "spotdl") return ["spotdl", "ffmpeg"];
  if (tool === "gallery-dl") return ["gallery-dl"];
  // tool === "yt-dlp". Transcripts skip ffprobe but still need YouTube's
  // extractor to work, so Deno too; a thumbnail is found without it (and uses
  // Deno when it's there).
  const deno = needsJsRuntime(url) ? ["deno"] : [];
  if (filetype === "image") return ["yt-dlp", "ffmpeg"];
  if (filetype === "transcript") return ["yt-dlp", "ffmpeg", ...deno];
  return ["yt-dlp", "ffmpeg", "ffprobe", ...deno];
}

/**
 * The source's other filetypes whose tools are all installed — what the
 * Installer can offer instead of installing the missing tool (e.g. an unknown
 * site defaults to Website, but with no monolith, Video may still work).
 */
export function installedAlternatives(
  source: SourceType,
  current: Filetype,
  url: string,
  isInstalled: (tool: string) => boolean,
): Filetype[] {
  return supportedFiletypes(source).filter(
    (ft) => ft !== current && requiredTools(source, ft, url).every((tool) => isInstalled(tool)),
  );
}
