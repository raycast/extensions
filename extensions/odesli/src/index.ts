import { Clipboard, getSelectedText, showToast, showHUD, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { addToHistory } from "./storage";

interface Entity {
  id: string;
  type: string;
  title?: string;
  artistName?: string;
  thumbnailUrl?: string;
  apiProvider: string;
  platforms: string[];
}

interface SongInfo {
  entityUniqueId: string;
  pageUrl: string;
  entitiesByUniqueId?: Record<string, Entity>;
}

class SongNotFoundError extends Error {
  constructor() {
    super("Song not found.");
  }
}

class UnknownError extends Error {
  constructor() {
    super("Unknown error.");
  }
}

const getTextFromSelectionOrClipboard = async () => {
  try {
    const selectedText = await getSelectedText();

    return {
      text: selectedText,
      fromClipboard: false,
    };
  } catch {
    const clipboardText = await Clipboard.read();

    return {
      text: clipboardText.text,
      fromClipboard: true,
    };
  }
};

const convertToOdesliLink = async (text: string) => {
  const songInfo = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(text)}`);

  if (!songInfo.ok && songInfo.status === 404) {
    throw new SongNotFoundError();
  }

  if (!songInfo.ok) {
    throw new UnknownError();
  }

  const songInfoJson = (await songInfo.json()) as SongInfo;

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

export default async function main() {
  const { text, fromClipboard } = await getTextFromSelectionOrClipboard();

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to convert link.",
      message: "Please select a link or copy it to clipboard.",
    });

    return;
  }

  try {
    const result = await convertToOdesliLink(text);

    // Create a descriptive HUD message
    let hudMessage = "Odesli link copied!";
    if (result.title && result.artist) {
      hudMessage = `${result.title} - ${result.artist}`;
    } else if (result.title) {
      hudMessage = result.title;
    }

    if (fromClipboard) {
      await Clipboard.copy(result.url);
      await showHUD(`✓ ${hudMessage}`);
      return;
    }

    await Clipboard.paste(result.url);
    await showHUD(`✓ ${hudMessage}`);
  } catch (error) {
    if (error instanceof SongNotFoundError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to convert link.",
        message: "Song not found.",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to convert link.",
      message: "Unknown error.",
    });
  }
}
