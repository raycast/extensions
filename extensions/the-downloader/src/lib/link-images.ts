import fs from "node:fs";
import path from "node:path";
import { safeFetch } from "./safe-fetch.js";

// A post's images, for engines that can look at them (Apple's on-device model,
// Ollama vision models). The Chat: Look at Images preference decides: ask
// once per chat (the default), always, or never.

/** At most this many images go with one question: each one costs time and part of the context window. */
export const MAX_CHAT_IMAGES = 4;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type ImagePreference = "ask" | "always" | "never";

/** What to do with a post's images: ask first, send them, or skip them (no images, a text-only engine, or "never"). */
export function imageDecision(
  preference: string | undefined,
  seesImages: boolean,
  count: number,
): "ask" | "use" | "skip" {
  if (!seesImages || count === 0 || preference === "never") return "skip";
  return preference === "always" ? "use" : "ask";
}

/** The Ask Each Time question. */
export function imageQuestion(count: number): string {
  if (count > MAX_CHAT_IMAGES) return `Let the AI look at the first ${MAX_CHAT_IMAGES} of this post's ${count} images?`;
  return count === 1 ? "Let the AI look at this post's image?" : `Let the AI look at this post's ${count} images?`;
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/avif": "avif",
};

function abortError(): Error {
  return Object.assign(new Error("The request was stopped."), { name: "AbortError" });
}

/**
 * Download up to `max` images into `dir` through safeFetch (never the local
 * network), skipping any that fail. Returns the saved files, in order.
 */
export async function fetchImages(
  urls: string[],
  dir: string,
  options: { signal?: AbortSignal; max?: number } = {},
): Promise<string[]> {
  const max = options.max ?? MAX_CHAT_IMAGES;
  const saved: string[] = [];
  fs.mkdirSync(dir, { recursive: true });
  for (const url of urls) {
    if (saved.length >= max) break;
    if (options.signal?.aborted) throw abortError();
    try {
      const response = await safeFetch(url, { signal: options.signal, accept: ["image/"], maxBytes: MAX_IMAGE_BYTES });
      const type = response.contentType.split(";")[0].trim().toLowerCase();
      const file = path.join(dir, `image-${saved.length + 1}.${EXTENSIONS[type] ?? "img"}`);
      fs.writeFileSync(file, response.body);
      saved.push(file);
    } catch (error) {
      if (options.signal?.aborted) throw abortError();
      console.error("Couldn't fetch an image for the chat", error);
    }
  }
  return saved;
}
