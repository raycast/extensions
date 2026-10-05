import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { LIMITS, TIMEOUTS } from "./config";
import { forEachWithConcurrency, readCappedBytes } from "./fetcher";
import { getLogger } from "./logger";
import { fetchPageSuppliedUrl } from "./networkGuard";
import { displaySafe, displaySafeSvgDataUri } from "./svgUtils";
import { redactUrlForLog, redactUrlsInText } from "./urlUtils";

const log = getLogger("image");

/**
 * Where guarded image downloads land. The OS temp dir, not `supportPath`: these
 * are disposable copies for display, and macOS purges its temp dir on its own.
 */
const IMAGE_DIR = join(tmpdir(), "digger-images");

const EXTENSION: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
  "image/heic": ".heic",
};

/**
 * The image format from the file's own first bytes, for servers that send a
 * favicon as `application/octet-stream` or `text/plain` — which Raycast rendered
 * anyway when it fetched the URL itself, so rejecting them would lose icons.
 */
function sniffExtension(bytes: Buffer): string | undefined {
  const b = bytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return ".png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ".jpg";
  if (b.length >= 4 && b.toString("latin1", 0, 4) === "GIF8") return ".gif";
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return ".webp";
  if (b.length >= 4 && b[0] === 0 && b[1] === 0 && (b[2] === 1 || b[2] === 2) && b[3] === 0) return ".ico";
  if (/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(b.toString("utf8", 0, 1024))) return ".svg";
  return undefined;
}

/**
 * Downloads an image a page referenced and returns a local file Raycast can
 * render.
 *
 * Handing Raycast the page's URL as an image source lets Raycast fetch it
 * itself — outside the network guard, redirects and all — so a page could point
 * an `og:image` or a favicon at a router or a cloud metadata endpoint. Fetching
 * here keeps every page-chosen request behind the same check as the rest of the
 * extension.
 *
 * Throws on a non-2xx, on a body that is not an image, and on one at or over
 * the size cap — each of which shows as the tile's fallback, never as a broken
 * picture. A `data:` URI is returned as-is: rendering it makes no request.
 */
export async function fetchImageToFile(url: string, pageUrl: string, signal?: AbortSignal): Promise<string> {
  // A data URI makes no request to render — except an SVG one, which can carry
  // external references of its own; that one is made display-safe first.
  if (/^data:image\//i.test(url)) return displaySafeSvgDataUri(url) ?? url;
  const file = (ext: string) => join(IMAGE_DIR, createHash("sha1").update(url).digest("hex") + ext);

  const timeout = AbortSignal.timeout(TIMEOUTS.IMAGE_FETCH);
  const response = await fetchPageSuppliedUrl(url, pageUrl, {
    headers: { "Accept-Encoding": "identity", Accept: "image/*" },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`HTTP ${response.status}`);
  }
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  // An HTML body is a soft-404 page, whatever its bytes; don't sniff it into an image.
  if (type === "text/html") {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Not an image (text/html)");
  }
  const { bytes, truncated } = await readCappedBytes(response, LIMITS.MAX_IMAGE_BYTES);
  if (truncated) throw new Error(`${Math.round(LIMITS.MAX_IMAGE_BYTES / 1024 / 1024)} MB or larger`);
  const ext = EXTENSION[type] ?? sniffExtension(bytes);
  if (!ext) throw new Error(`Not an image (${type || "no content type"})`);

  const path = file(ext);
  await mkdir(IMAGE_DIR, { recursive: true });
  // An SVG can fetch on its own once rendered (see displaySafe); rasters cannot.
  // Always written: a changed file of the same size must not show the old one.
  await writeFile(path, ext === ".svg" ? displaySafe(bytes.toString("utf8")) : bytes);
  return path;
}

export type GuardedImage = { path: string } | { error: string };

/**
 * Loads several page-referenced images through the guard, a few at a time.
 * Past `LIMITS.MAX_GUARDED_IMAGES` an image simply has no entry, and its tile
 * keeps its fallback icon. A caller's cancellation is not a failure: nothing is
 * recorded or logged for it.
 */
export async function loadGuardedImages(
  urls: readonly string[],
  pageUrl: string,
  signal?: AbortSignal,
  onEach?: (url: string, result: GuardedImage) => void,
): Promise<Map<string, GuardedImage>> {
  const targets = [...new Set(urls)].slice(0, LIMITS.MAX_GUARDED_IMAGES);
  const out = new Map<string, GuardedImage>();
  await forEachWithConcurrency(
    targets,
    LIMITS.IMAGE_CONCURRENCY,
    async (url) => {
      let result: GuardedImage;
      try {
        result = { path: await fetchImageToFile(url, pageUrl, signal) };
      } catch (error) {
        if (signal?.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        result = { error: message };
        log.warn("image:unchecked", { url: redactUrlForLog(url), error: redactUrlsInText(message) });
      }
      out.set(url, result);
      onEach?.(url, result);
    },
    signal,
  );
  return out;
}
