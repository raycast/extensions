import { imageToAscii, imageToDots } from "./image-art";

const TWEMOJI_VERSION = "17.0.3";
const EMOJI_COLUMNS = 24;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_CACHED_EMOJI = 64;
const cache = new Map<string, Promise<string>>();

export function emojiAssetName(emoji: string) {
  const normalized = emoji.includes("\u200d") ? emoji : emoji.replace(/\ufe0f/g, "");
  return Array.from(normalized, (character) => character.codePointAt(0)!.toString(16)).join("-");
}

export async function emojiToAscii(emoji: string, variant = "ascii"): Promise<string> {
  const name = emojiAssetName(emoji);
  const cacheKey = `${variant}:${name}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const request = (async () => {
    const response = await fetch(
      `https://cdn.jsdelivr.net/gh/jdecked/twemoji@v${TWEMOJI_VERSION}/assets/72x72/${name}.png`,
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error("Could not load this emoji. Check your connection or try another emoji.");
    const render = variant === "dots" ? imageToDots : imageToAscii;
    return render(Buffer.from(await response.arrayBuffer()), EMOJI_COLUMNS);
  })();
  if (cache.size >= MAX_CACHED_EMOJI) cache.delete(cache.keys().next().value!);
  cache.set(cacheKey, request);
  try {
    return await request;
  } catch (error) {
    cache.delete(cacheKey);
    throw error;
  }
}
