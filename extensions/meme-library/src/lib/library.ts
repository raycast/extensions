import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";

// This module has no Raycast imports, so you can test it with plain Node.

export type Meme = {
  file: string;
  path: string;
  // A small static PNG for the grid. Raycast decodes every frame of a GIF thumbnail, so big GIFs load slowly.
  thumbnail?: string;
  title: string;
  tags: string[];
  addedAt: number;
  lastUsedAt?: number;
  useCount: number;
};

type Entry = Omit<Meme, "file" | "path" | "thumbnail">;
type Index = Record<string, Entry>;

export type Source =
  { kind: "url"; url: string } | { kind: "file"; path: string } | { kind: "raw-image" } | { kind: "none" };

const INDEX_FILE = ".meme-library.json";
const LOCK_FOLDER = ".meme-library.lock";
const STALE_LOCK_MS = 30_000;
const THUMBNAIL_FOLDER = ".thumbnails";
const THUMBNAIL_SIZE = 512;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const EXTENSIONS: Record<string, string> = {
  gif: ".gif",
  png: ".png",
  jpeg: ".jpg",
  webp: ".webp",
  heic: ".heic",
};
const IMAGE_EXTENSIONS = new Set([".gif", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".tiff", ".bmp"]);

export function resolveFolder(folder: string | undefined): string {
  const value = folder?.trim() || "~/Memes";
  return value.startsWith("~") ? join(homedir(), value.slice(1)) : value;
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(path).toLowerCase());
}

// Order matters: the HTML <img src> is the only clipboard field that still points to an
// animated GIF after a browser "Copy Image". The bitmap on the clipboard is a static frame.
export function pickSource(content: { text?: string; file?: string; html?: string }): Source {
  const src = content.html?.match(/<img\b[^>]*?\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
  if (src && /^(https?:|data:image\/)/i.test(src)) return { kind: "url", url: decodeEntities(src) };
  if (content.file) {
    const path = content.file.startsWith("file://") ? decodeURIComponent(new URL(content.file).pathname) : content.file;
    if (isImagePath(path)) return { kind: "file", path };
  }
  const text = content.text?.trim();
  if (text && /^(https?:\/\/\S+|data:image\/\S+)$/i.test(text)) return { kind: "url", url: text };
  return { kind: "raw-image" };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function detectImageType(data: Buffer): keyof typeof EXTENSIONS | undefined {
  const ascii = data.subarray(0, 12).toString("latin1");
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "gif";
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpeg";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "webp";
  if (ascii.slice(4, 8) === "ftyp" && /^(heic|heix|mif1|avif)/.test(ascii.slice(8, 12))) return "heic";
  return undefined;
}

export async function download(url: string, timeoutMs = DOWNLOAD_TIMEOUT_MS): Promise<{ data: Buffer; name?: string }> {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    const meta = url.slice(0, comma);
    const body = url.slice(comma + 1);
    return { data: meta.endsWith(";base64") ? Buffer.from(body, "base64") : Buffer.from(decodeURIComponent(body)) };
  }
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh) Raycast Meme Library" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const name = decodeURIComponent(basename(new URL(response.url || url).pathname));
    return { data: Buffer.from(await response.arrayBuffer()), name };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`Download timed out after ${Math.round(timeoutMs / 1000)} s`);
    }
    throw error;
  }
}

// X and Threads show "GIFs" as MP4 videos. These helpers find the MP4 behind a post link
// and convert it to a real GIF, so the meme still loops when you paste it.

export function isVideo(data: Buffer): boolean {
  const ascii = data.subarray(4, 12).toString("latin1");
  return ascii.startsWith("ftyp") && !/^ftyp(heic|heix|mif1|avif)/.test(ascii);
}

const X_POST = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/i;
const THREADS_POST = /^https?:\/\/(?:www\.)?threads\.(?:net|com)\/@[^/]+\/post\//i;

// An animated WebP has an ANIM chunk. Some apps paste it as one still frame, so it is converted to GIF.
export function isAnimatedWebp(data: Buffer): boolean {
  return detectImageType(data) === "webp" && data.subarray(0, 64).includes(Buffer.from("ANIM"));
}

export function isPostUrl(url: string): boolean {
  return X_POST.test(url) || THREADS_POST.test(url);
}

type XMedia = {
  type?: string;
  video_info?: { variants?: { content_type?: string; url?: string; bitrate?: number }[] };
};

// Returns the MP4 URL of the first GIF or video in the post.
export async function findPostVideo(url: string, timeoutMs = DOWNLOAD_TIMEOUT_MS): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs);
  const id = url.match(X_POST)?.[1];
  if (id) {
    // The public embed endpoint that X uses for embedded posts. It does not need a login.
    const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
    const response = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}`, { signal });
    if (!response.ok) throw new Error(`Could not read the X post (${response.status})`);
    const post = (await response.json()) as { mediaDetails?: XMedia[] };
    const media =
      post.mediaDetails?.find((item) => item.type === "animated_gif") ??
      post.mediaDetails?.find((item) => item.type === "video");
    const mp4 = media?.video_info?.variants
      ?.filter((variant) => variant.content_type === "video/mp4" && variant.url)
      .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0]?.url;
    if (!mp4) throw new Error("This X post has no GIF or video");
    return mp4;
  }
  // Threads shows a login page to scripts, so the post link has no media URL (tested on a real Mac).
  throw new Error("Threads needs a login. Click the GIF to open it, then use Copy Image");
}

// Giphy URLs on Threads and other sites point to small previews (for example 200.gif).
// Returns the URL of the full-size original GIF.
export function fullGiphyUrl(url: string): string {
  const id = url.match(/^https?:\/\/media\d*\.giphy\.com\/media\/(?:v1\.[^/]+\/)?([A-Za-z0-9]+)\/[^/]+$/i)?.[1];
  return id ? `https://media.giphy.com/media/${id}/giphy.gif` : url;
}

const FFMPEG_PATHS = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"];

// Raycast does not use your shell PATH, so look in the usual Homebrew folders.
async function findFfmpeg(): Promise<string> {
  for (const path of FFMPEG_PATHS) {
    if (await stat(path).catch(() => undefined)) return path;
  }
  throw new Error("Install ffmpeg to save videos as GIFs: brew install ffmpeg");
}

export async function videoToGif(video: Buffer, extension = ".mp4"): Promise<Buffer> {
  const ffmpeg = await findFfmpeg();
  const base = join(tmpdir(), `meme-library-${randomUUID()}`);
  try {
    await writeFile(`${base}${extension}`, video);
    // A palette made from the video gives much better colors than the default GIF palette.
    await promisify(execFile)(ffmpeg, [
      "-y",
      "-i",
      `${base}${extension}`,
      "-vf",
      "fps=15,scale='min(480,iw)':-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse",
      "-loop",
      "0",
      `${base}.gif`,
    ]);
    return await readFile(`${base}.gif`);
  } finally {
    await rm(`${base}${extension}`, { force: true });
    await rm(`${base}.gif`, { force: true });
  }
}

// Index changes in this process run one at a time, so two saves cannot overwrite each other's entries.
const queues = new Map<string, Promise<unknown>>();

export class Library {
  readonly folder: string;

  constructor(folder: string | undefined) {
    this.folder = resolveFolder(folder);
  }

  private async readIndex(): Promise<Index> {
    const target = join(this.folder, INDEX_FILE);
    let text: string;
    try {
      text = await readFile(target, "utf8");
    } catch {
      return {};
    }
    try {
      const index: unknown = JSON.parse(text);
      if (index && typeof index === "object" && !Array.isArray(index)) return index as Index;
    } catch {
      // Handled below.
    }
    // Keep a damaged index as a backup. If we overwrite it, all titles and tags are lost.
    await rename(target, join(this.folder, `.meme-library.damaged-${Date.now()}.json`)).catch(() => undefined);
    return {};
  }

  private async writeIndex(index: Index): Promise<void> {
    const target = join(this.folder, INDEX_FILE);
    const temp = `${target}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(index, null, 2));
    await rename(temp, target);
  }

  private changeIndex<T>(change: (index: Index) => Promise<T>): Promise<T> {
    const run = (queues.get(this.folder) ?? Promise.resolve()).then(async () => {
      await mkdir(this.folder, { recursive: true });
      return this.withLock(async () => change(await this.readIndex()));
    });
    queues.set(
      this.folder,
      run.catch(() => undefined),
    );
    return run;
  }

  // Each Raycast command runs in its own JavaScript context, so the queue above cannot stop Save Meme
  // and the grid from changing the index at the same time. mkdir is atomic, so a lock folder can.
  private async withLock<T>(work: () => Promise<T>): Promise<T> {
    const lock = join(this.folder, LOCK_FOLDER);
    for (;;) {
      try {
        await mkdir(lock);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        // A command that crashed can leave the lock behind.
        const age = Date.now() - ((await stat(lock).catch(() => undefined))?.mtimeMs ?? Date.now());
        if (age > STALE_LOCK_MS) await rm(lock, { recursive: true, force: true });
        else await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    try {
      return await work();
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
  }

  private thumbnailPath(file: string): string {
    return join(this.folder, THUMBNAIL_FOLDER, `${file}.png`);
  }

  // Uses the macOS sips tool. For a GIF, sips writes the first frame. If it fails, the grid uses the original file.
  private async makeThumbnail(file: string): Promise<string | undefined> {
    const target = this.thumbnailPath(file);
    try {
      await mkdir(join(this.folder, THUMBNAIL_FOLDER), { recursive: true });
      await promisify(execFile)("/usr/bin/sips", [
        "-s",
        "format",
        "png",
        "-Z",
        String(THUMBNAIL_SIZE),
        join(this.folder, file),
        "--out",
        target,
      ]);
      return target;
    } catch {
      return undefined;
    }
  }

  // Files that you drop into the folder yourself also show up. They use the file time.
  // list() only uses thumbnails that already exist, so the grid opens at once. See makeThumbnails().
  async list(): Promise<Meme[]> {
    await mkdir(this.folder, { recursive: true });
    const index = await this.readIndex();
    const files = (await readdir(this.folder)).filter((file) => !file.startsWith(".") && isImagePath(file));
    const memes = await Promise.all(
      files.map(async (file) => {
        const path = join(this.folder, file);
        const fileTime = (await stat(path)).mtimeMs;
        const thumbnail = await stat(this.thumbnailPath(file)).catch(() => undefined);
        const entry = index[file] ?? { title: basename(file, extname(file)), tags: [], addedAt: fileTime, useCount: 0 };
        const fresh = thumbnail && thumbnail.mtimeMs >= fileTime;
        return { ...entry, file, path, thumbnail: fresh ? this.thumbnailPath(file) : undefined };
      }),
    );
    return memes.sort((a, b) => (b.lastUsedAt ?? b.addedAt) - (a.lastUsedAt ?? a.addedAt));
  }

  // Makes the missing thumbnails, 4 at a time.
  async makeThumbnails(memes: Meme[]): Promise<void> {
    for (let i = 0; i < memes.length; i += 4) {
      await Promise.all(memes.slice(i, i + 4).map((meme) => this.makeThumbnail(meme.file)));
    }
  }

  // Returns the saved meme and whether it was already in the library.
  async add(data: Buffer, title?: string): Promise<{ meme: Meme; duplicate: boolean }> {
    const type = detectImageType(data);
    if (!type) throw new Error("This is not a GIF, PNG, JPEG, WebP, or HEIC image");
    const file = createHash("sha256").update(data).digest("hex").slice(0, 16) + EXTENSIONS[type];
    const path = join(this.folder, file);
    return this.changeIndex(async (index) => {
      const existing = index[file];
      if (existing) return { meme: { ...existing, file, path }, duplicate: true };
      await writeFile(path, data);
      const cleanTitle = title ? basename(title, extname(title)).replace(/[-_]+/g, " ").trim() : "";
      const entry: Entry = { title: cleanTitle || "Untitled meme", tags: [], addedAt: Date.now(), useCount: 0 };
      index[file] = entry;
      await this.writeIndex(index);
      return { meme: { ...entry, file, path, thumbnail: await this.makeThumbnail(file) }, duplicate: false };
    });
  }

  async addFile(path: string): Promise<{ meme: Meme; duplicate: boolean }> {
    return this.add(await readFile(path), basename(path));
  }

  async update(meme: Meme, changes: Partial<Pick<Entry, "title" | "tags" | "lastUsedAt" | "useCount">>): Promise<void> {
    await this.changeIndex(async (index) => {
      const { title, tags, addedAt, lastUsedAt, useCount } = meme;
      index[meme.file] = { ...(index[meme.file] ?? { title, tags, addedAt, lastUsedAt, useCount }), ...changes };
      await this.writeIndex(index);
    });
  }

  async markUsed(meme: Meme): Promise<void> {
    await this.changeIndex(async (index) => {
      const { title, tags, addedAt, useCount } = meme;
      const entry = index[meme.file] ?? { title, tags, addedAt, useCount };
      index[meme.file] = { ...entry, lastUsedAt: Date.now(), useCount: entry.useCount + 1 };
      await this.writeIndex(index);
    });
  }

  async remove(meme: Meme, deleteFile: (path: string) => Promise<void> = (p) => rm(p)): Promise<void> {
    await deleteFile(meme.path);
    await rm(this.thumbnailPath(meme.file), { force: true });
    await this.changeIndex(async (index) => {
      delete index[meme.file];
      await this.writeIndex(index);
    });
  }
}
