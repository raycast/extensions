import ytdl from "ytdl-core";

const URL_PATTERN = /https?:\/\/[^\s)>\]]+/g;

function trimUrlCandidate(value: string) {
  return value.trim().replace(/[.,;:!?]+$/, "");
}

export function getYouTubeVideoUrl(video: string | undefined | null): string | undefined {
  if (!video) return undefined;

  try {
    const videoId = ytdl.getVideoID(trimUrlCandidate(video));
    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch {
    return undefined;
  }
}

export function getYouTubeVideoUrlFromText(text: string | undefined | null): string | undefined {
  if (!text) return undefined;

  return (text.match(URL_PATTERN) ?? []).map(getYouTubeVideoUrl).find(Boolean);
}

export function removeYouTubeVideoReferenceFromText(text: string): string {
  return text.replace(URL_PATTERN, " ").replace(/\s+/g, " ").trim();
}
