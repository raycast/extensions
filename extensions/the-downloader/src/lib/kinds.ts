import { Color, Icon } from "@raycast/api";
import { DownloadKind } from "./download-session.js";

// One place for how each kind of download is named, colored and drawn, so the
// live view, the charts and the history list all agree.

const KIND_TITLE: Record<DownloadKind, string> = {
  video: "Video",
  audio: "Audio",
  gallery: "Gallery",
  spotify: "Spotify",
  website: "Webpage",
  transcript: "Transcript",
  thumbnail: "Thumbnail",
};

export const KIND_COLOR: Record<DownloadKind, Color> = {
  video: Color.Blue,
  audio: Color.Purple,
  gallery: Color.Yellow,
  spotify: Color.Green,
  website: Color.Blue,
  transcript: Color.Yellow,
  thumbnail: Color.Yellow,
};

export const KIND_ICON: Record<DownloadKind, Icon> = {
  video: Icon.Video,
  audio: Icon.Music,
  gallery: Icon.Image,
  spotify: Icon.Music,
  website: Icon.Globe,
  transcript: Icon.Document,
  thumbnail: Icon.Image,
};

export function kindTitle(kind: DownloadKind): string {
  return KIND_TITLE[kind];
}

/** What a gallery or Spotify download counts. */
export function itemNoun(kind: DownloadKind): string {
  return kind === "spotify" ? "track" : "file";
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** An https thumbnail URL that is safe inside Markdown's `(...)`, or undefined. */
export function safeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString().replace(/\(/g, "%28").replace(/\)/g, "%29") : undefined;
  } catch {
    return undefined;
  }
}
