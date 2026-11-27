import fs from "node:fs";
import path from "node:path";
import { abortError, safeFetch } from "./safe-fetch.js";

// A post's images, for engines that can look at them (Apple's on-device model,
// Ollama vision models). Chat About Link's Look at Images preference decides: ask
// once per chat (the default), always, or never.

/** At most this many images go with one question: each one costs time and part of the context window. */
export const MAX_CHAT_IMAGES = 4;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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

/**
 * The image's format from its first bytes, as a file extension, or undefined
 * for anything the vision engines can't read (SVG, which is text, an HTML
 * error page sent as `image/jpeg`, a truncated file). Servers label images
 * loosely (`image/jpg`, `image/pjpeg`, `application/octet-stream`), and the
 * engines go by the file's extension, so the bytes decide, not the header.
 */
export function imageExtension(body: Uint8Array): string | undefined {
  const ascii = (from: number, to: number) => String.fromCharCode(...body.subarray(from, to));
  if (body.length < 12) return undefined;
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "jpg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "png";
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(0, 2) === "BM") return "bmp";
  if (ascii(0, 4) === "II*\x00" || ascii(0, 4) === "MM\x00*") return "tiff";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "avif" || brand === "avis") return "avif";
    if (["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(brand)) return "heic";
  }
  return undefined;
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
      const extension = imageExtension(response.body);
      if (!extension) {
        console.error("Skipped an image the AI can't read", response.contentType, url);
        continue;
      }
      const file = path.join(dir, `image-${saved.length + 1}.${extension}`);
      fs.writeFileSync(file, response.body);
      saved.push(file);
    } catch (error) {
      if (options.signal?.aborted) throw abortError();
      console.error("Couldn't fetch an image for the chat", error);
    }
  }
  return saved;
}
