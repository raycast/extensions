// vendored from https://github.com/leodr/generate-emoji-list
import { fetch } from "cross-fetch";
const UNICODE_REGEX = /\/([\d\w-]*?).png/;

/**
 * Returns a map with emojis as its key and the corresponding short codes as its
 * value.
 */
export async function getEmojiShortCodes(): Promise<Map<string, string[]>> {
  const shortCodes = await fetchEmojiShortcuts();

  const emojiMap = new Map<string, string[]>();

  Object.entries(shortCodes).forEach(([shortCode, url]) => {
    const unicode = url.match(UNICODE_REGEX);

    if (unicode === null || unicode[1] == null) return;

    const emojis = unicode[1]
      .split("-")
      .map((str) => parseInt(`0x${str}`, 16))
      .filter(Boolean)
      .map((charCode) => String.fromCodePoint(charCode))
      .join("\u200d");

    const previousShortCode = emojiMap.get(emojis);

    if (previousShortCode != null) {
      emojiMap.set(emojis, [...previousShortCode, shortCode]);
    } else {
      emojiMap.set(emojis, [shortCode]);
    }
  });

  return emojiMap;
}

const GITHUB_API_EMOJI_URL = "https://api.github.com/emojis";

interface GitHubEmojiResponse {
  [shortcut: string]: string;
}

async function fetchEmojiShortcuts(): Promise<GitHubEmojiResponse> {
  const response = await fetch(GITHUB_API_EMOJI_URL);
  const json = (await response.json()) as GitHubEmojiResponse;

  return json;
}
