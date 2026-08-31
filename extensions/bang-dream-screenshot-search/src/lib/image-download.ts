import { createHash } from "node:crypto";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";

export const MAX_JPEG_BYTES = 20 * 1024 * 1024;
export const DOWNLOAD_TIMEOUT_MS = 15_000;
export const CLIPBOARD_DIRECTORY_NAME = "bang-dream-screenshot-search";
export const CLIPBOARD_FILENAME_PATTERN = /^clipboard-[a-f0-9]{16}\.jpg$/;
const LEGACY_CLIPBOARD_FILENAME = "clipboard.jpg";

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export type DownloadJpegOptions = {
  fetchImpl?: typeof fetch;
  temporaryRoot?: string;
  maxBytes?: number;
  timeoutMs?: number;
};

export async function downloadJpeg(url: string, options: DownloadJpegOptions = {}): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBytes = options.maxBytes ?? MAX_JPEG_BYTES;
  const timeoutMs = options.timeoutMs ?? DOWNLOAD_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let bytes: Uint8Array;

  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Image download failed with HTTP ${response.status}.`);

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error("The selected image is larger than the allowed download size.");
    }

    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Image download timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (bytes.byteLength > maxBytes) throw new Error("The selected image is larger than the allowed download size.");
  if (!isJpeg(bytes)) throw new Error("The selected file is not a valid JPEG image.");

  const directory = join(options.temporaryRoot ?? tmpdir(), CLIPBOARD_DIRECTORY_NAME);
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const filename = `clipboard-${digest}.jpg`;
  const destination = join(directory, filename);
  const partial = join(directory, `${filename}.download`);
  await mkdir(directory, { recursive: true });

  try {
    await writeFile(partial, bytes);
    await rename(partial, destination);
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }

  return destination;
}

export async function removeStaleClipboardFiles(currentPath: string): Promise<void> {
  const directory = dirname(currentPath);
  const currentFilename = basename(currentPath);
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name !== currentFilename &&
          (CLIPBOARD_FILENAME_PATTERN.test(entry.name) || entry.name === LEGACY_CLIPBOARD_FILENAME),
      )
      .map((entry) => rm(join(directory, entry.name), { force: true })),
  );
}
