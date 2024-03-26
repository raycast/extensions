import { Clipboard, getSelectedText, showToast, closeMainWindow, Toast } from "@raycast/api";
import fetch from "node-fetch";
import packageJson from "../package.json";

interface SongInfo {
  url: string;
}

class UnknownError extends Error {
  constructor() {
    super("Unknown error.");
  }
}

const getTextFromSelectionOrClipboard = async () => {
  const selectedText = await getSelectedText();

  if (selectedText) {
    return {
      text: selectedText,
      fromClipboard: false,
    };
  }

  const clipboardText = await Clipboard.read();

  if (clipboardText) {
    return {
      text: clipboardText.text,
      fromClipboard: true,
    };
  }

  return {
    text: null,
    fromClipboard: false,
  };
};

const convertToSongwhipLink = async (url: string) => {
  const songInfo = await fetch(`https://songwhip.com/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": `Raycast Songwhip extension - ${packageJson.version}`,
    },
    body: JSON.stringify({
      url,
    }),
  });

  if (!songInfo.ok) {
    throw new UnknownError();
  }

  const songInfoJson = (await songInfo.json()) as SongInfo;

  return songInfoJson.url;
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
    const songwhipLink = await convertToSongwhipLink(text);

    if (fromClipboard) {
      await Clipboard.copy(songwhipLink);

      await showToast({
        style: Toast.Style.Success,
        title: "Link copied to clipboard.",
        message: "You can now paste it anywhere.",
      });

      return;
    }

    await Clipboard.paste(songwhipLink);

    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to convert link.",
      message: "Unknown error.",
    });
  }
}
