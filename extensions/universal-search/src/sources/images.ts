import { readFile, stat, mkdtemp, rm, readdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { spawn } from "child_process";

const IMG_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "heic", "heif"]);
const MAX_DATA_URL_BYTES = 4 * 1024 * 1024;

function extOf(p: string): string {
  return (p.match(/\.([^./\\]+)$/)?.[1] ?? "").toLowerCase();
}

export function isImagePath(p: string): boolean {
  return IMG_EXTS.has(extOf(p));
}

function mimeFor(ext: string): string {
  if (ext === "svg") return "image/svg+xml";
  if (ext === "jpg") return "image/jpeg";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return `image/${ext}`;
}

/** Read an image file and return a base64 `data:` URL, or null if too big / unreadable. */
export async function fileToImageDataUrl(filePath: string): Promise<string | null> {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return null;
    if (s.size > MAX_DATA_URL_BYTES) return null;
    const buf = await readFile(filePath);
    const ext = extOf(filePath);
    return `data:${mimeFor(ext)};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function runSips(args: string[], signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/sips", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (c) => (err += c.toString("utf8")));
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", reject);
    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (code === 0) resolve();
      else reject(new Error(`sips exited ${code}: ${err.trim()}`));
    });
  });
}

function runSipsOutput(args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/sips", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => (out += c.toString("utf8")));
    child.stderr.on("data", (c) => (err += c.toString("utf8")));
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", reject);
    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (code === 0) resolve(out);
      else reject(new Error(`sips exited ${code}: ${err.trim()}`));
    });
  });
}

/** Resize JPEG base64 by scale and return a Markdown-compatible data URL. */
export async function resizeJpegBase64ToDataUrl(
  imageBase64: string,
  scale = 0.5,
  signal?: AbortSignal,
): Promise<string | null> {
  let tmp: string | null = null;
  try {
    tmp = await mkdtemp(path.join(tmpdir(), "us-contact-"));
    const inputPath = path.join(tmp, "input.jpg");
    const outputPath = path.join(tmp, "output.jpg");
    await writeFile(inputPath, Buffer.from(imageBase64, "base64"));
    const info = await runSipsOutput(["-g", "pixelWidth", "-g", "pixelHeight", inputPath], signal);
    const width = Number(info.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const height = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    const resizedWidth = Math.max(1, Math.round(width * scale));
    const resizedHeight = Math.max(1, Math.round(height * scale));
    await runSips(["-z", String(resizedHeight), String(resizedWidth), inputPath, "--out", outputPath], signal);
    const s = await stat(outputPath);
    if (s.size > MAX_DATA_URL_BYTES) return null;
    const buf = await readFile(outputPath);
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    if (tmp) {
      try {
        await rm(tmp, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

function runQuickLook(args: string[], signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/qlmanage", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (c) => (err += c.toString("utf8")));
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", reject);
    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (code === 0) resolve();
      else reject(new Error(`qlmanage exited ${code}: ${err.trim()}`));
    });
  });
}

/** Render a Quick Look thumbnail as a base64 PNG/JPEG `data:` URL, or null on failure. */
export async function quickLookThumbnailToImageDataUrl(
  filePath: string,
  signal?: AbortSignal,
  prefix = "us-thumb-",
): Promise<string | null> {
  let tmp: string | null = null;
  try {
    tmp = await mkdtemp(path.join(tmpdir(), prefix));
    await runQuickLook(["-t", "-s", "1200", "-o", tmp, filePath], signal);
    const files = await readdir(tmp);
    const preview = files.find((f) => /\.(png|jpe?g)$/i.test(f));
    if (!preview) return null;
    const outPath = path.join(tmp, preview);
    const s = await stat(outPath);
    if (s.size > MAX_DATA_URL_BYTES) return null;
    const buf = await readFile(outPath);
    const ext = extOf(outPath);
    return `data:${mimeFor(ext)};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    if (tmp) {
      try {
        await rm(tmp, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

/** Render the first page of a PDF as a base64 PNG `data:` URL, or null on failure. */
export async function pdfToImageDataUrl(filePath: string, signal?: AbortSignal): Promise<string | null> {
  let tmp: string | null = null;
  try {
    tmp = await mkdtemp(path.join(tmpdir(), "us-pdf-"));
    const outPath = path.join(tmp, "page.png");
    await runSips(["-s", "format", "png", "-Z", "1200", filePath, "--out", outPath], signal);
    const s = await stat(outPath);
    if (s.size > MAX_DATA_URL_BYTES) return null;
    const buf = await readFile(outPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    if (tmp) {
      try {
        await rm(tmp, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

/** Render a Quick Look thumbnail for a video as a base64 PNG/JPEG `data:` URL, or null on failure. */
export async function videoToImageDataUrl(filePath: string, signal?: AbortSignal): Promise<string | null> {
  return quickLookThumbnailToImageDataUrl(filePath, signal, "us-video-");
}
