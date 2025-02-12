import { Clipboard, getSelectedText, showToast, closeMainWindow, Toast } from "@raycast/api";
import fetch from "node-fetch";

interface SongInfo {
  entityUniqueId: string;
  pageUrl: string;
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
  } catch (error) {
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

  return songInfoJson.pageUrl;
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
    const odesliLink = await convertToOdesliLink(text);

    if (fromClipboard) {
      await Clipboard.copy(odesliLink);

      await showToast({
        style: Toast.Style.Success,
        title: "Link copied to clipboard.",
        message: "You can now paste it anywhere.",
      });

      return;
    }

    await Clipboard.paste(odesliLink);

    await closeMainWindow();
  } catch (error) {
    if (error instanceof SongNotFoundError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to convert link.",
        message: "Song not found.",
      });
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to convert link.",
      message: "Unknown error.",
    });
  }
}
