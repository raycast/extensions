import { SourceType, Video } from "../types.js";
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

/** The webpage save modes (the `webpageSaveMode` preference): two monolith ones and Markdown. */
export type WebpageSaveMode = "complete" | "lightweight" | "markdown";

/** True for the save mode that writes the article as Markdown, without monolith. */
export function isMarkdownMode(mode: string | undefined): boolean {
  return mode === "markdown";
}

/** What a save mode is called in the download view and the history. */
export function saveModeLabel(mode: string | undefined): string {
  return isMarkdownMode(mode) ? "Markdown" : mode === "lightweight" ? "Lightweight (no JavaScript)" : "Complete";
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

/** What yt-dlp found when the form probed the link: its details, or nothing it can download. */
export type LinkProbe = { kind: "media"; video: Video } | { kind: "no-media" };

/** A filetype the source usually offers but this link can't give, and why. */
export type UnavailableFiletype = { filetype: Filetype; reason: string };

/** True when some of the source's filetypes run yt-dlp, so probing the link with it tells what's possible. */
export function probesWithYtdlp(source: SourceType): boolean {
  return supportedFiletypes(source).some((ft) => resolveTool(source, ft) === "yt-dlp");
}

/**
 * What the probed media can't give, by filetype. Only explicit evidence
 * counts: a format list where every format lacks video (or sound), no caption
 * tracks, no thumbnail. A result without formats (a playlist, an extractor
 * that lists none) rules nothing out.
 */
function mediaGaps(video: Video): Partial<Record<Filetype, string>> {
  const formats = video.formats ?? [];
  if (formats.length === 0) return {};
  const gaps: Partial<Record<Filetype, string>> = {};
  if (formats.every((f) => f.vcodec === "none")) gaps.video = "the link has audio only";
  if (formats.every((f) => f.acodec === "none")) gaps.audio = "the video has no sound";
  const captions =
    Object.keys(video.subtitles ?? {}).filter((lang) => lang !== "live_chat").length +
    Object.keys(video.automatic_captions ?? {}).length;
  if (captions === 0) gaps.transcript = "the video has no captions";
  if (!video.thumbnail && !video.thumbnails?.length) gaps.image = "the video has no thumbnail";
  return gaps;
}

/**
 * The Filetype options for this link, once yt-dlp has probed it: the source's
 * filetypes minus what the link can't give, plus what the probe proved it can
 * (a webpage with a video with captions also offers Image and Transcript). A
 * page with no media can still be saved as a webpage, whatever the site.
 * Without a probe, or if nothing would be left, the source's own list stands.
 */
export function probedFiletypes(
  source: SourceType,
  probe: LinkProbe | undefined,
): { options: Filetype[]; unavailable: UnavailableFiletype[] } {
  const base = supportedFiletypes(source);
  if (!probe || !probesWithYtdlp(source)) return { options: base, unavailable: [] };
  const usesYtdlp = (ft: Filetype) => resolveTool(source, ft) === "yt-dlp";
  const unavailable: UnavailableFiletype[] = [];
  let candidates: Filetype[];
  if (probe.kind === "no-media") {
    for (const ft of base.filter(usesYtdlp)) {
      unavailable.push({ filetype: ft, reason: "yt-dlp finds no video or audio on this page" });
    }
    candidates = [...base.filter((ft) => !usesYtdlp(ft)), "website"];
  } else {
    const gaps = mediaGaps(probe.video);
    candidates = FILETYPES.filter((ft) => base.includes(ft) || usesYtdlp(ft)).filter((ft) => {
      const reason = gaps[ft];
      if (!reason) return true;
      if (base.includes(ft)) unavailable.push({ filetype: ft, reason });
      return false;
    });
  }
  const options = FILETYPES.filter((ft) => candidates.includes(ft));
  return options.length > 0 ? { options, unavailable } : { options: base, unavailable: [] };
}

/** The filetype to show: the user's pick when the link offers it, else the source default, else the first option. */
export function chooseFiletype(options: Filetype[], picked: Filetype | undefined, fallback: Filetype): Filetype {
  if (picked && options.includes(picked)) return picked;
  return options.includes(fallback) ? fallback : (options[0] ?? fallback);
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
 * so a missing Deno doesn't block Vimeo, Twitch and the like. `webpageMode` is
 * the chosen save mode when the filetype is a website.
 */
export function requiredTools(source: SourceType, filetype: Filetype, url = "", webpageMode = ""): string[] {
  const tool = resolveTool(source, filetype);
  // The Markdown save mode reads the page itself; only the HTML modes run monolith.
  if (tool === "monolith") return isMarkdownMode(webpageMode) ? [] : ["monolith"];
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
