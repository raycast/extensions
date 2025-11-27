import { Clipboard, getSelectedText } from "@raycast/api";
import { ConversionResult, SongInfo } from "./types";
import { addToHistory } from "./storage";

// Clipboard and selection helper
export const getTextFromSelectionOrClipboard = async () => {
  try {
    const selected = await getSelectedText();

    if (selected && selected.length > 0) {
      return { text: selected, fromClipboard: false };
    }

    const clipboard = (await Clipboard.readText()) ?? "";
    return { text: clipboard, fromClipboard: true };
  } catch {
    const fallback = (await Clipboard.readText().catch(() => "")) ?? "";
    return { text: fallback, fromClipboard: true };
  }
};

// Custom error classes
export class SongNotFoundError extends Error {
  constructor() {
    super("Song not found.");
  }
}

export class UnknownError extends Error {
  constructor() {
    super("Unknown error.");
  }
}

// Date formatting utility
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
};

// Odesli API conversion
export const convertToOdesliLink = async (text: string): Promise<ConversionResult> => {
  const response = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(text)}`);

  if (!response.ok && response.status === 404) {
    throw new SongNotFoundError();
  }

  if (!response.ok) {
    throw new UnknownError();
  }

  const songInfoJson = (await response.json()) as SongInfo;

  // Extract song details
  let title: string | undefined;
  let artist: string | undefined;
  let thumbnailUrl: string | undefined;

  if (songInfoJson.entitiesByUniqueId && songInfoJson.entityUniqueId) {
    const entity = songInfoJson.entitiesByUniqueId[songInfoJson.entityUniqueId];
    if (entity) {
      title = entity.title;
      artist = entity.artistName;
      thumbnailUrl = entity.thumbnailUrl;
    }
  }

  // Save to history
  try {
    await addToHistory({
      originalUrl: text,
      odesliUrl: songInfoJson.pageUrl,
      title,
      artist,
      thumbnailUrl,
    });
  } catch (error) {
    // Don't fail the conversion if history save fails
    console.error("Failed to save to history:", error);
  }

  return {
    url: songInfoJson.pageUrl,
    title,
    artist,
  };
};
